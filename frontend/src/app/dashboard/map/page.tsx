'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { 
  MapPin, Shield, Navigation, Search,
  Filter, Info, Plus, Home,
  Stethoscope, Zap, MousePointer2,
  Compass, ArrowRight,
  ExternalLink,
  ChevronRight,
  Star, Trash2
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { cacheData, getCachedData } from '@/lib/db';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { calculateDistance } from '@/lib/utils';

// Dynamically import the Map component to avoid SSR issues
const SecurityMap = dynamic(() => import('@/components/dashboard/SecurityMap'), { ssr: false });

export default function SafeZoneMapPage() {
  const { user } = useAuth();
  const [safeZones, setSafeZones] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const userLocation = useLocation();
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  const initialCenterSet = React.useRef(false);

  useEffect(() => {
    if (userLocation && !initialCenterSet.current) {
      setMapCenter([userLocation[1], userLocation[0]]);
      fetchData(userLocation[0], userLocation[1]);
      initialCenterSet.current = true;
    }
  }, [userLocation]);

  useEffect(() => {
    if (mapCenter && safeZones.length > 0) {
      setSafeZones(prev => prev.map(hub => ({
        ...hub,
        distance: calculateDistance(hub.location.coordinates[1], hub.location.coordinates[0], mapCenter[0], mapCenter[1])
      })));
    }
  }, [mapCenter]);

  const fetchData = async (lng: number, lat: number) => {
    setLoading(true);
    try {
      // 1. Fetch only NEARBY backend hubs (50km radius)
      const hubRes = await api.get(`/safezones/nearby?lng=${lng}&lat=${lat}&distance=50000`);
      
      const ignoredIds = JSON.parse(localStorage.getItem('shield_ignored_hubs') || '[]');
      
      const savedHubs = hubRes.data.data
        .filter((h: any) => !ignoredIds.includes(h._id))
        .map((h: any) => ({
           ...h,
           distance: calculateDistance(h.location.coordinates[1], h.location.coordinates[0], lat, lng)
        }));
      setSafeZones(savedHubs);

      // 2. Fetch incidents for the heatmap
      const incRes = await api.get('/incidents?verified=true');
      setIncidents(incRes.data.data);
    } catch (error) {
      console.error('API fetch failed');
    }
  };

  const handleScanUpdate = (elements: any[]) => {
    const ignoredIds = JSON.parse(localStorage.getItem('shield_ignored_hubs') || '[]');
    
    // Mapping scanner data to our SafeHub format
    const transformed = elements
      .filter(s => {
        const lat = s.center ? s.center.lat : s.lat;
        const lon = s.center ? s.center.lon : s.lon;
        const stableId = s.id ? s.id.toString() : `geo-${lat.toFixed(6)}-${lon.toFixed(6)}`;
        if (ignoredIds.includes(stableId)) return false;

        const fullTags = JSON.stringify(s.tags || {}).toLowerCase();
        return /police|hospital|clinic|doctor|patrol|chowki|fire|medical/.test(fullTags);
      })
      .map(s => {
        const lat = s.center ? s.center.lat : s.lat;
        const lon = s.center ? s.center.lon : s.lon;
        const fullTags = JSON.stringify(s.tags || {}).toLowerCase();
        const isPolice = /police|security|chowki/i.test(fullTags);
        
        // STABLE ID: Use OSM ID or fallback to precise coordinate string
        const stableId = s.id ? s.id.toString() : `geo-${lat.toFixed(6)}-${lon.toFixed(6)}`;
        
        const refLat = mapCenter ? mapCenter[0] : (userLocation ? userLocation[1] : lat);
        const refLon = mapCenter ? mapCenter[1] : (userLocation ? userLocation[0] : lon);
        
        // CORRECTION: Use proper Haversine distance in meters
        const distMeters = calculateDistance(lat, lon, refLat, refLon);
        
        // CORRECTION: Standardize labeling for cleaner UI
        const displayType = isPolice ? 'POLICE STATION' : (/hospital|doctor|clinic|medical/i.test(fullTags) ? 'HOSPITAL / CLINIC' : 'SAFE HUB');
        
        return {
          _id: stableId,
          name: s.tags.name || displayType,
          type: displayType,
          address: s.tags['addr:street'] ? `${s.tags['addr:street']} ${s.tags['addr:housenumber'] || ''}` : 'Public Safety Service Point',
          location: { coordinates: [lon, lat] },
          rating: 5,
          distance: distMeters,
          raw: s
        };
      })
      .sort((a, b) => a.distance - b.distance);

    setSafeZones(prev => {
        // Broad Proximity Check: If a hub is within ~50 meters, it's a duplicate.
        const newSafeZones = [...prev];
        transformed.forEach(newHub => {
           const isDuplicate = newSafeZones.find(z => 
             z._id === newHub._id || 
             (Math.abs(z.location.coordinates[1] - newHub.location.coordinates[1]) < 0.0005 && 
              Math.abs(z.location.coordinates[0] - newHub.location.coordinates[0]) < 0.0005)
           );
           if (!isDuplicate) newSafeZones.push(newHub);
        });
        
        // PERFORMANCE CAP: Never track more than 100 hubs at once to avoid crashing
        return newSafeZones
          .sort((a,b) => a.distance - b.distance)
          .slice(0, 100);
    });
    setLoading(false);
  };

  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
        toast.success(`JUMPING TO: ${data[0].display_name.split(',')[0]}...`);
      } else {
        toast.error('ADDRESS NOT FOUND');
        setLoading(false);
      }
    } catch (e) {
      toast.error('CONNECTION FAILED');
      setLoading(false);
    }
  };

  const saveHub = async (spot: any) => {
    try {
      const isPolice = /police|security|chowki/i.test(JSON.stringify(spot.tags));
      await api.post('/safezones', {
        name: spot.tags.name || (isPolice ? 'Police Station' : 'Safe Hub'),
        type: isPolice ? 'Police Station' : 'Hospital',
        address: spot.tags['addr:street'] ? `${spot.tags['addr:street']} ${spot.tags['addr:housenumber'] || ''}` : 'Public Safety Service Point',
        location: {
           type: 'Point',
           coordinates: [spot.center ? spot.center.lon : spot.lon, spot.center ? spot.center.lat : spot.lat]
        },
        rating: 5,
        isActive: true
      });
      toast.success('HUB SAVED TO LOCAL NETWORK');
    } catch (e) {
      toast.error('FAILED TO SAVE HUB');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // 1. ADD TO PERSISTENT IGNORE LIST (Local)
      const ignoredIds = JSON.parse(localStorage.getItem('shield_ignored_hubs') || '[]');
      if (!ignoredIds.includes(id)) {
        ignoredIds.push(id);
        localStorage.setItem('shield_ignored_hubs', JSON.stringify(ignoredIds));
      }

      // 2. DELETE FROM BACKEND (If it's our hub)
      if (id.length === 24) {
        await api.delete(`/safezones/${id}`);
      }
      
      // Locally remove/hide it instantly
      setSafeZones(prev => prev.filter(z => z._id !== id));
      toast.success('HUB REMOVED PERMANENTLY');
    } catch (e) {
      setSafeZones(prev => prev.filter(z => z._id !== id));
      toast.success('HUB HIDDEN FROM VIEW');
    }
  };

  const filteredZones = safeZones.filter(zone => {
    const matchesSearch = 
      zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zone.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    // RADIUS FILTER: Only show hubs within 50km of what the user is currently looking at
    // This prevents "stray" hubs from other cities appearing in the list
    const isNearby = zone.distance < 50000; // 50km in meters
    
    return matchesSearch && isNearby;
  });

  const handleNavigate = (zone: any) => {
    if (!userLocation) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation[1]},${userLocation[0]}&destination=${zone.location.coordinates[1]},${zone.location.coordinates[0]}&travelmode=walking`;
    window.open(url, '_blank');
  };

  const handleSelectZone = (zone: any) => {
    setMapCenter([zone.location.coordinates[1], zone.location.coordinates[0]]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-20 px-0">
      {/* ── MAP HEADING (SIMPLIFIED) ── */}
      <div className="px-6 lg:px-4 flex items-center gap-5 pt-8">
         <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center shrink-0">
            <MapPin className="text-green-500" size={24} />
         </div>
         <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase text-white">
            Safe Zones <span className="text-green-500">Near You</span>
         </h1>
      </div>

      {/* ── FULL WIDTH MAP CANVASES (EDGE-TO-EDGE) ── */}
      <div className="w-full h-[650px] overflow-hidden relative bg-black group/map border-y border-white/5">
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none opacity-60" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none opacity-60" />
        
        {!userLocation ? (
          <div className="absolute inset-0 z-20 bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center text-center p-12">
             <div className="w-28 h-28 relative mb-10">
                <div className="absolute inset-0 bg-accent-magenta/20 rounded-full blur-[60px] animate-pulse" />
                <div className="relative w-full h-full bg-neutral-950 border border-white/10 rounded-full flex items-center justify-center shadow-2xl">
                    <MousePointer2 className="text-accent-magenta" size={44} />
                </div>
             </div>
             <h3 className="text-4xl font-black tracking-tighter uppercase italic mb-6">GPS Sync Required</h3>
             <p className="text-neutral-500 font-black uppercase tracking-[0.3em] text-[10px] max-w-sm leading-relaxed opacity-60">
                Connect your GPS to synchronize your position and find the nearest safety hubs in the SHIELD network.
             </p>
          </div>
        ) : (
          <SecurityMap 
            userLocation={[userLocation[1], userLocation[0]]} 
            mapCenter={mapCenter || [userLocation[1], userLocation[0]]}
            safeZones={filteredZones}
            incidents={incidents}
            onScan={handleScanUpdate}
          />
        )}
        
        <div className="absolute bottom-12 right-12 z-10 flex flex-col gap-4 pointer-events-none">
           <button 
             onClick={() => setMapCenter([userLocation![1], userLocation![0]])}
             className="w-16 h-16 bg-black border border-white/5 text-white hover:border-accent-magenta/50 transition-all duration-500 rounded-[1.8rem] shadow-2xl pointer-events-auto flex items-center justify-center group"
           >
             <Compass size={28} className="group-hover:rotate-180 transition-transform duration-700 text-accent-magenta" />
           </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-10">
         <div className="space-y-1 px-6 lg:px-4">
            <h2 className="text-3xl font-black tracking-tight uppercase text-white">Safe <span className="text-green-500">Hubs</span></h2>
            <p className="text-neutral-600 text-[10px] font-black uppercase tracking-[0.3em]">Directory</p>
         </div>

         <form onSubmit={handleAddressSearch} className="relative w-full md:w-[450px] group/search px-6 lg:px-4">
            <div className="absolute -inset-1 bg-green-500/5 rounded-2xl blur-lg opacity-0 group-focus-within/search:opacity-100 transition duration-500" />
            <div className="relative flex items-center bg-black border border-white/5 rounded-2xl p-1 transition-all group-focus-within/search:border-green-500/20 shadow-2xl">
               <div className="w-10 flex justify-center text-neutral-600">
                  <Search size={18} />
               </div>
               <input 
                  placeholder="SEARCH WORLD ADDRESS..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent py-3 text-[11px] font-black uppercase tracking-[0.1em] text-white outline-none placeholder:text-neutral-800"
               />
               <button type="submit" className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5">
                  JUMP
               </button>
            </div>
         </form>
      </div>

      <Card className="bg-black border-none rounded-[4rem] overflow-hidden shadow-2xl mx-6 lg:mx-4">
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="bg-neutral-900/50 border-b border-white/5 uppercase font-black text-[11px] tracking-[0.3em] text-neutral-600">
                  <th className="px-10 py-8">Safe Hub</th>
                  <th className="px-10 py-8 text-center">Type</th>
                  <th className="px-10 py-8 text-center uppercase">Details</th>
                  <th className="px-10 py-8 text-right">Action</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
               {loading && filteredZones.length === 0 ? (
                  <tr>
                     <td colSpan={4} className="py-24 text-center">
                        <div className="flex flex-col items-center opacity-30">
                           <Shield className="animate-spin text-accent-magenta mb-4" size={40} />
                           <p className="text-[11px] font-black uppercase tracking-widest">Scanning Grid...</p>
                        </div>
                     </td>
                  </tr>
               ) : filteredZones.length === 0 ? (
                  <tr>
                     <td colSpan={4} className="py-24 text-center opacity-30">
                        <p className="text-[11px] font-black uppercase tracking-widest italic">No matching hubs found.</p>
                     </td>
                  </tr>
               ) : (
                  filteredZones.map((zone) => (
                     <tr key={zone._id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => handleSelectZone(zone)}>
                        <td className="px-10 py-10">
                           <div className="flex items-center gap-6">
                              <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-white/10 flex items-center justify-center text-green-500 group-hover:border-green-500/40 transition-all duration-500 shadow-xl group-hover:scale-110">
                                 {zone.type.toLowerCase().includes('police') ? <Shield size={28} /> : (zone.type.toLowerCase().includes('hospital') || zone.type.toLowerCase().includes('clinic')) ? <Stethoscope size={28} /> : <Home size={28} />}
                              </div>
                              <div>
                                 <h4 className="text-[15px] font-black text-white group-hover:text-green-500 transition-colors uppercase tracking-tight line-clamp-1 max-w-[300px]">{zone.name}</h4>
                                 <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest mt-1 opacity-60 truncate max-w-sm italic">{zone.address}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-10 py-10 text-center">
                           <span className="px-4 py-2 bg-neutral-900 text-neutral-400 text-[9px] font-black uppercase tracking-[0.2em] rounded-lg border border-white/5">
                              {zone.type}
                           </span>
                        </td>
                        <td className="px-10 py-10">
                           <div className="flex justify-center items-center gap-2">
                              <p className="text-[11px] font-black text-white mr-4">
                                {zone.distance > 1000 ? `${(zone.distance / 1000).toFixed(1)} km` : `${Math.round(zone.distance)} m`}
                              </p>
                              <div className="hidden sm:flex gap-1">
                                {[1,2,3,4,5].map(star => (
                                   <Star key={star} size={14} className={star <= zone.rating ? 'text-green-500 fill-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'text-neutral-800'} />
                                ))}
                              </div>
                           </div>
                        </td>
                        <td className="px-10 py-10 text-right">
                           <div className="flex items-center justify-end gap-3">
                              <button 
                                 onClick={(e) => { e.stopPropagation(); saveHub(zone.raw); }}
                                 className="h-10 px-5 bg-green-500/10 border border-green-500/20 text-green-500 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-green-500 hover:text-white transition-all active:scale-95 flex items-center gap-2 shadow-xl"
                              >
                                 SAVE <Plus size={14} />
                              </button>
                              <button 
                                 onClick={(e) => { e.stopPropagation(); handleNavigate(zone); }}
                                 className="h-10 px-5 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-green-500 hover:text-white transition-all active:scale-95 flex items-center gap-2 shadow-xl"
                              >
                                 GO <ExternalLink size={14} />
                              </button>
                              <button 
                                 onClick={(e) => { e.stopPropagation(); handleDelete(zone._id); }}
                                 className="h-10 w-10 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-xl"
                                 title="Remove Hub"
                              >
                                 <Trash2 size={16} />
                              </button>
                           </div>
                        </td>
                     </tr>
                  ))
               )}
            </tbody>
         </table>
      </Card>
    </div>
  );
}
