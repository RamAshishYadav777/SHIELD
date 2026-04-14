'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from './useSocket';
import { useAuth } from './useAuth';
import { calculateDistance } from '@/lib/utils';

// how old a position can be before we treat it as Windows OS cache junk
// Windows Location Services can return a position cached days ago even with maximumAge:0
const MAX_POSITION_AGE_MS = 60_000; // 60 seconds

export interface LocationData {
  coords: [number, number] | null;
  accuracy: number | null;
  positionAge: number | null; // how many seconds old the position is
  status: 'initializing' | 'searching' | 'stale' | 'unauthorized' | 'disabled' | 'active' | 'insecure' | 'manual';
  error?: string;
}

export interface LocationState extends LocationData {
  refresh: (isSilent?: boolean) => void;
  hardReset: () => void;
  setManualCoords: (coords: [number, number]) => void;
}

const LocationContext = createContext<LocationState>({ 
  coords: null, 
  accuracy: null,
  positionAge: null,
  status: 'initializing',
  refresh: () => {},
  hardReset: () => {},
  setManualCoords: () => {}
});

// use ip-api.com (free, no key needed) to get a rough cross-check position
// this catches the case where Windows reports wrong city due to cached wifi data
async function getIpLocation(): Promise<{ lat: number; lon: number; city: string } | null> {
  try {
    const res = await fetch('http://ip-api.com/json/?fields=lat,lon,city,status', { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data.status === 'success') return { lat: data.lat, lon: data.lon, city: data.city };
    return null;
  } catch {
    return null;
  }
}

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<LocationData>({ coords: null, accuracy: null, positionAge: null, status: 'initializing' });
  const { socket } = useSocket();
  const { user } = useAuth();
  
  // prevent spamming socket with too many updates
  const lastLocation = useRef<[number, number] | null>(null);
  const lastUpdateTimestamp = useRef<number>(0);
  const retryCount = useRef<number>(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // always use latest refs for socket/user in callbacks
  const socketRef = useRef(socket);
  const userRef = useRef(user);

  useEffect(() => {
    socketRef.current = socket;
    userRef.current = user;
  }, [socket, user]);

  // process a geolocation position, rejecting OS-cached stale readings
  const handlePosition = useCallback((position: GeolocationPosition, isSilent = false) => {
    const { longitude, latitude, accuracy } = position.coords;
    const coords: [number, number] = [longitude, latitude];

    // KEY FIX: check how old this position actually is
    // position.timestamp is when the OS *measured* it, not when it returned it
    // Windows Location Services can return measurements from hours/days ago
    const positionAgeMs = Date.now() - position.timestamp;
    const positionAgeSec = Math.round(positionAgeMs / 1000);

    if (positionAgeMs > MAX_POSITION_AGE_MS) {
      // this is an OS-cached stale position — do NOT update the map with it
      console.warn(`[SHIELD] Rejected stale position (${positionAgeSec}s old, ${Math.round(accuracy)}m accuracy)`);
      
      if (!isSilent) {
        setState(prev => ({
          ...prev,
          positionAge: positionAgeSec,
          status: 'stale',
          error: `Windows returned a ${positionAgeSec}s old position. Retrying...`
        }));
        // schedule a retry — Windows cache usually clears within a few seconds
        scheduleRetry();
      }
      return;
    }

    // fresh position — accept it
    console.info(`[SHIELD] Fresh position accepted (${positionAgeSec}s old, ±${Math.round(accuracy)}m)`);
    retryCount.current = 0;
    if (retryTimer.current) clearTimeout(retryTimer.current);

    setState(prev => {
      if (prev.coords && prev.accuracy !== null && !isSilent) {
        const dist = calculateDistance(prev.coords[1], prev.coords[0], latitude, longitude);
        // skip tiny updates so the map doesn't jitter
        if (dist < 5 && Math.abs(prev.accuracy - accuracy) < 5) return prev;
      }
      return { ...prev, coords, accuracy, positionAge: positionAgeSec, status: prev.status === 'manual' ? 'manual' : 'active' };
    });

    lastLocation.current = coords;
    lastUpdateTimestamp.current = Date.now();

    // only push to server if accuracy is good enough to be useful
    // avoids saving ISP-based city guesses into the database
    if (socketRef.current && userRef.current && accuracy <= 1000) {
      socketRef.current.emit('update-location', {
        userId: userRef.current.id,
        coordinates: coords
      });
    }
  }, []);

  // retry getting a fresh position after Windows gives a stale one
  const scheduleRetry = useCallback(() => {
    retryCount.current += 1;
    // exponential backoff: 2s, 4s, 8s... up to 30s max
    const delay = Math.min(2000 * Math.pow(2, retryCount.current - 1), 30_000);
    console.info(`[SHIELD] Retry #${retryCount.current} scheduled in ${delay / 1000}s`);
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(() => {
      navigator.geolocation.getCurrentPosition(
        pos => handlePosition(pos),
        err => {
          if (err.code === 1) {
            setState({ coords: null, accuracy: null, positionAge: null, status: 'unauthorized', error: 'Location blocked' });
          } else {
            scheduleRetry(); // keep retrying on timeout
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }, delay);
  }, [handlePosition]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('geolocation' in navigator)) {
      setState({ coords: null, accuracy: null, positionAge: null, status: 'disabled' });
      return;
    }

    if (!window.isSecureContext) {
      setState({ coords: null, accuracy: null, positionAge: null, status: 'insecure' });
      return;
    }

    setState(prev => ({ ...prev, status: 'searching' }));

    // initial one-shot fetch — gives something immediately on page load
    navigator.geolocation.getCurrentPosition(
      pos => handlePosition(pos),
      err => {
        if (err.code === 1) {
          setState({ coords: null, accuracy: null, positionAge: null, status: 'unauthorized', error: 'Location blocked' });
        }
        // on timeout or unknown error, start retrying  
        else {
          scheduleRetry();
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // continuous position watch — fires whenever the OS updates its position
    // on laptops this updates every 1-30 seconds depending on WiFi changes
    const watchId = navigator.geolocation.watchPosition(
      pos => handlePosition(pos),
      error => {
        if (error.code === 1) {
          setState(prev => ({ ...prev, accuracy: null, positionAge: null, status: 'unauthorized', error: 'Location Access Denied' }));
        }
        // for timeout/unavailable errors, keep showing whatever we have
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );

    // periodic heartbeat to prod Windows Location Services into refreshing
    // without this Windows can go dormant and serve cached data indefinitely
    const heartbeatId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        pos => handlePosition(pos, true), // silent — don't change status indicator
        () => {}, // ignore heartbeat errors
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }, 15_000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(heartbeatId);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [handlePosition, scheduleRetry]);

  const refresh = useCallback((isSilent = false) => {
    if (!isSilent) setState(prev => ({ ...prev, status: 'searching' }));
    retryCount.current = 0;
    if (retryTimer.current) clearTimeout(retryTimer.current);
    lastUpdateTimestamp.current = 0;
    
    navigator.geolocation.getCurrentPosition(
      pos => handlePosition(pos, isSilent),
      err => {
        if (isSilent) return;
        const newStatus = err.code === 1 ? 'unauthorized' : 'searching';
        setState(prev => ({ ...prev, accuracy: null, positionAge: null, status: newStatus, error: err.message }));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [handlePosition]);

  const setManualCoords = useCallback((coords: [number, number]) => {
    setState({ coords, accuracy: 0, positionAge: 0, status: 'manual' });
    lastLocation.current = coords;
  }, []);

  // listen for map right-click → manual pin drop
  useEffect(() => {
    const handleManual = (e: any) => setManualCoords(e.detail);
    window.addEventListener('shield-manual-location', handleManual);
    return () => window.removeEventListener('shield-manual-location', handleManual);
  }, [setManualCoords]);

  const hardReset = useCallback(() => {
    setState({ coords: null, accuracy: null, positionAge: null, status: 'searching' });
    lastLocation.current = null;
    lastUpdateTimestamp.current = 0;
    retryCount.current = 0;
    if (retryTimer.current) clearTimeout(retryTimer.current);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shield-hard-reset'));
    }
    refresh();
  }, [refresh]);

  return (
    <LocationContext.Provider value={{ ...state, refresh, hardReset, setManualCoords }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  return useContext(LocationContext).coords;
};

export const useLocationState = (): LocationState => {
  return useContext(LocationContext);
};
