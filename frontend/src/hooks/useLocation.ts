'use client';

import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';
import { useAuth } from './useAuth';

export const useLocation = () => {
  const [location, setLocation] = useState<[number, number] | null>(null);
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      console.error("Geolocation is not supported by your browser");
      return;
    }

    if (!window.isSecureContext) {
      console.warn("SHIELD Location Service: GPS tracking requires a secure context (HTTPS/localhost). Skipping live updates.");
      return;
    }

    // get a quick rough lock first
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setLocation(prev => (prev ? prev : coords));
      },
      () => { }, // fail silently
      { enableHighAccuracy: false, timeout: 3000 }
    );

    // start high-accuracy tracking in background
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        const coords: [number, number] = [longitude, latitude];
        setLocation(coords);

        if (socket && user) {
          socket.emit('update-location', {
            userId: user.id,
            coordinates: coords
          });
        }
      },
      (error) => {
        let msg = "Unknown location error";
        switch (error.code) {
          case error.PERMISSION_DENIED: msg = "Location access denied"; break;
          case error.POSITION_UNAVAILABLE: msg = "Location info unavailable"; break;
          case error.TIMEOUT: msg = "Location request timed out"; break;
        }
        console.warn(`SHIELD Location Service: ${msg}`, error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [socket, user]);

  return location;
};
