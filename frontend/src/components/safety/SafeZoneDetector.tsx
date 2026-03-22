'use client';

import { useEffect, useRef } from 'react';
import { useLocation } from '@/hooks/useLocation';
import api from '@/lib/api';
import { calculateDistance } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ShieldCheck } from 'lucide-react';

export default function SafeZoneDetector() {
  const userLocation = useLocation();
  const lastZoneRef = useRef<string | null>(null);
  const lastCoordRef = useRef<[number, number] | null>(null);
  const lastCheckTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!userLocation) return;

    const checkSafeZones = async () => {
      try {
        const [lng, lat] = userLocation;
        const now = Date.now();
        
        // Skip if moved < 50m AND it hasn't been 10 minutes since last check
        if (lastCoordRef.current) {
          const dist = calculateDistance(lat, lng, lastCoordRef.current[1], lastCoordRef.current[0]);
          if (dist < 50 && (now - lastCheckTimeRef.current) < 600000) {
            return;
          }
        }

        lastCoordRef.current = [lng, lat];
        lastCheckTimeRef.current = now;

        const res = await api.get(`/safezones/nearby?lng=${lng}&lat=${lat}&distance=500`);
        const zones = res.data.data;

        if (zones.length > 0) {
          const nearestZone = zones[0];
          
          if (lastZoneRef.current !== nearestZone._id) {
            handleEntry(nearestZone);
          }
        } else {
          lastZoneRef.current = null;
        }
      } catch (error) {
        console.error('Error checking safe zones:', error);
      }
    };

    const handleEntry = async (zone: any) => {
      lastZoneRef.current = zone._id;
      
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full glass shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-white/10 p-6 border-l-4 border-green-500`}>
          <div className="flex-1 w-0">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5 text-green-500">
                <ShieldCheck size={40} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-bold text-white uppercase tracking-widest">Safe Zone Entered</p>
                <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                  You have arrived at <span className="text-white font-bold">{zone.name}</span>. Contacts notified.
                </p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 5000 });

      try {
        await api.post('/users/at-safezone', { zoneName: zone.name });
      } catch (err) {
        console.error('Failed to notify arrival:', err);
      }
    };

    // Check more conservatively
    const interval = setInterval(checkSafeZones, 30000);
    checkSafeZones(); // Initial check

    return () => clearInterval(interval);
  }, [userLocation]);

  return null;
}
