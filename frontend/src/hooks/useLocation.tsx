'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSocket } from './useSocket';
import { useAuth } from './useAuth';
import { calculateDistance } from '@/lib/utils';

type LocationType = [number, number] | null;

const LocationContext = createContext<LocationType>(null);

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
  const [location, setLocation] = useState<LocationType>(null);
  const { socket } = useSocket();
  const { user } = useAuth();
  
  // keep track of changes
  const lastLocation = useRef<LocationType>(null);
  const lastUpdateTimestamp = useRef<number>(0);
  
  // refs to keep data fresh inside the loop
  const socketRef = useRef(socket);
  const userRef = useRef(user);

  // update refs when things change
  useEffect(() => {
    socketRef.current = socket;
    userRef.current = user;
  }, [socket, user]);

  useEffect(() => {
    if (typeof window === 'undefined' || !("geolocation" in navigator)) {
      return;
    }

    // gps needs https or localhost
    if (!window.isSecureContext) {
      console.warn("SHIELD: GPS needs HTTPS or localhost");
      return;
    }

    // get quick initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        if (!lastLocation.current) {
          setLocation(coords);
          lastLocation.current = coords;
          lastUpdateTimestamp.current = Date.now();
        }
      },
      () => { }, // skip if fails
      { enableHighAccuracy: false, timeout: 5000 }
    );

    // start live tracking
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        const { longitude, latitude } = position.coords;
        const coords: [number, number] = [longitude, latitude];

        // only update every 10 seconds
        if (now - lastUpdateTimestamp.current < 10000) return;

        // only update if moved more than 20 meters
        if (lastLocation.current) {
          const dist = calculateDistance(
            lastLocation.current[1], lastLocation.current[0],
            latitude, longitude
          );
          if (dist < 20) return; 
        }

        // save new location
        setLocation(coords);
        lastLocation.current = coords;
        lastUpdateTimestamp.current = now;

        // send to server
        if (socketRef.current && userRef.current) {
          socketRef.current.emit('update-location', {
            userId: userRef.current.id,
            coordinates: coords
          });
        }
      },
      (error) => {
        console.warn("SHIELD: Location error", error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }
    );

    // cleanup on close
    return () => navigator.geolocation.clearWatch(watchId);
  }, []); // run once

  return (
    <LocationContext.Provider value={location}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  return useContext(LocationContext);
};
