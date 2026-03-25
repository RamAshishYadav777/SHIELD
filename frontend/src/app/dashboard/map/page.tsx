'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { 
  MapPin, Shield, Navigation, Search,
  Filter, Info, Plus, Minus, Home,
  Stethoscope, Zap, MousePointer2,
  Compass, ArrowRight,
  ExternalLink,
  ChevronRight,
  Star, Trash2,
  Plane, Pill
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

const getHubColor = (type: string, tagsJson = "") => {
  const t = type.toUpperCase();
  const tags = tagsJson.toLowerCase();
  
  if (t.includes('POLICE') || tags.includes('police') || tags.includes('thana') || tags.includes('chowki')) return '#f97316'; // Orange
  if (t.includes('HOSPITAL') || t.includes('CLINIC') || t.includes('MEDICAL') || tags.includes('hospital') || tags.includes('clinic')) return '#22c55e'; // Green
  if (t.includes('PHARMACY') || tags.includes('pharmacy') || tags.includes('chemist')) return '#a855f7'; // Purple
  if (t.includes('FIRE') || tags.includes('fire')) return '#ef4444'; // Red
  return '#3b82f6'; // Blue (Default / Others)
};

export default function SafeZoneMapPage() {
  const { user } = useAuth();
  const [safeZones, setSafeZones] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const userLocation = useLocation();
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState(14);

  const initialCenterSet = React.useRef(false);

  useEffect(() => {
    if (userLocation && !initialCenterSet.current) {
      setMapCenter([userLocation[1], userLocation[0]]);
      fetchData(userLocation[0], userLocation[1]);
      initialCenterSet.current = true;
    } else if (!userLocation && user?.location?.coordinates && !initialCenterSet.current) {
       const [lng, lat] = user.location.coordinates;
       setMapCenter([lat, lng]);
       fetchData(lng, lat);
    }
  }, [userLocation, user]);

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
      const hubRes = await api.get(`/safezones/nearby?lng=${lng}&lat=${lat}&distance=50000`);
      const ignoredIds = JSON.parse(localStorage.getItem('shield_ignored_hubs') || '[]');
      const savedHubs = hubRes.data.data
        .filter((h: any) => !ignoredIds.includes(h._id))
        .map((h: any) => ({
           ...h,
           color: getHubColor(h.type),
           distance: calculateDistance(h.location.coordinates[1], h.location.coordinates[0], lat, lng)
        }));
      setSafeZones(savedHubs);
      const incRes = await api.get('/incidents?verified=true');
      setIncidents(incRes.data.data);
    } catch (error) {
      console.error('API fetch failed');
    } finally {
      setLoading(false);
    }
  };

  const handleScanUpdate = (elements: any[]) => {
    const ignoredIds = JSON.parse(localStorage.getItem('shield_ignored_hubs') || '[]');
    const transformed = elements
      .filter(s => {
        const fullTags = JSON.stringify(s.tags || {}).toLowerCase();
        return /police|thana|outpost|hospital|clinic|doctor|patrol|chowki|fire|medical|pharmacy|chemist|bank|atm|post_office|security|govt|government/.test(fullTags);
      })
      .map(s => {
        const lat = s.center ? s.center.lat : s.lat;
        const lon = s.center ? s.center.lon : s.lon;
        const fullTags = JSON.stringify(s.tags || {}).toLowerCase();
        const isPolice = /police|security|thana|chowki|chowkee|outpost/i.test(fullTags);
        const stableId = s.id ? s.id.toString() : `geo-${lat.toFixed(6)}-${lon.toFixed(6)}`;
        const refLat = mapCenter ? mapCenter[0] : (userLocation ? userLocation[1] : lat);
        const refLon = mapCenter ? mapCenter[1] : (userLocation ? userLocation[0] : lon);
        const distMeters = calculateDistance(lat, lon, refLat, refLon);
        const isMedical = /hospital|doctor|clinic|medical|health/i.test(fullTags);
        const isPharmacy = /pharmacy|chemist/i.test(fullTags);
        const isFire = /fire/i.test(fullTags);
        const isSecurity = /security|patrol|police|thana/i.test(fullTags);
        const displayType = isPolice || isSecurity ? 'POLICE STATION' : (isPharmacy ? 'PHARMACY' : (isFire ? 'FIRE STATION' : (isMedical ? 'HOSPITAL / CLINIC' : 'SAFE HUB')));
        const color = getHubColor(displayType, fullTags);
        return {
          _id: stableId,
          name: (s.tags.name || displayType).toUpperCase(),
          type: displayType,
          color,
          address: s.tags['addr:street'] ? `${s.tags['addr:street']} ${s.tags['addr:housenumber'] || ''}` : 'Public Safety Service Point',
          location: { coordinates: [lon, lat] },
          rating: 5,
          distance: distMeters,
          raw: s
        };
      })
      .sort((a, b) => a.distance - b.distance);

    setSafeZones(prev => {
        const newSafeZones = [...prev];
        transformed.forEach(newHub => {
           const isDuplicate = newSafeZones.find(z => 
             z._id === newHub._id || 
             (Math.abs(z.location.coordinates[1] - newHub.location.coordinates[1]) < 0.0001 && 
              Math.abs(z.location.coordinates[0] - newHub.location.coordinates[0]) < 0.0001)
           );
           if (!isDuplicate) newSafeZones.push(newHub);
        });
        return newSafeZones.sort((a,b) => a.distance - b.distance).slice(0, 100);
    });
    setLoading(false);
  };

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;
    setLoading(true);
    try {
      const match = safeZones.find(z => z.name.toLowerCase().includes(searchTerm.toLowerCase()));
      if (match) {
         const coords: [number, number] = [match.location.coordinates[1], match.location.coordinates[0]];
         setMapCenter(coords);
         setZoom(16);
         toast.success(`GRID SYNCED TO: ${match.name}`);
         setLoading(false);
         return;
      }
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=1`);
      const data = await res.json();
      if (data && data[0]) {
        const [lat, lon] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setSafeZones([]); 
        setMapCenter([lat, lon]);
        setZoom(15);
        fetchData(lon, lat);
        setSearchTerm(""); // CLEAR SEARCH TERM TO REVEAL ALL LOCAL HUBS
        toast.success(`GRID SYNCHRONIZED: ${data[0].display_name.split(',')[0].toUpperCase()}`);
      } else {
        toast.error('LOCATION NOT RECOGNIZED');
      }
    } catch (e) {
      toast.error('SYNC FAILED');
    } finally {
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
        location: { type: 'Point', coordinates: [spot.center ? spot.center.lon : spot.lon, spot.center ? spot.center.lat : spot.lat] },
        rating: 5,
        isActive: true
      });
      toast.success('HUB SAVED');
    } catch (e) {
      toast.error('SAVE FAILED');
    }
  };

  // Connect Map state back to Page state
  const handleMapCenterChange = (center: [number, number]) => {
     if (!mapCenter) return;
     // Only update if difference is meaningful
     const diffLat = Math.abs(mapCenter[0] - center[0]);
     const diffLng = Math.abs(mapCenter[1] - center[1]);
     if (diffLat > 0.0001 || diffLng > 0.0001) {
       setMapCenter(center);
     }
  };

  const filteredZones = safeZones.filter(zone => {
    const matchesSearch = zone.name.toLowerCase().includes(searchTerm.toLowerCase()) || zone.type.toLowerCase().includes(searchTerm.toLowerCase());
    if (searchTerm.length > 2 && matchesSearch) return true;
    return matchesSearch && zone.distance < 50000;
  });

  const handleSelectZone = (zone: any) => {
    setMapCenter([zone.location.coordinates[1], zone.location.coordinates[0]]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (zone: any) => {
    if (!userLocation) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation[1]},${userLocation[0]}&destination=${zone.location.coordinates[1]},${zone.location.coordinates[0]}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-20 px-0">
      <div className="px-6 lg:px-4 flex items-center gap-5 pt-8">
         <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center shrink-0">
            <MapPin className="text-green-500" size={24} />
         </div>
         <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase text-white">
            Safe Zones <span className="text-green-500">Near You</span>
         </h1>
      </div>

      <div className="w-full h-[650px] overflow-hidden relative bg-black group/map border-y border-white/5">
        {!mapCenter ? (
          <div className="absolute inset-0 z-20 bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center text-center p-12">
             <div className="w-28 h-28 relative mb-10">
                <div className="absolute inset-0 bg-accent-magenta/20 rounded-full blur-[60px] animate-pulse" />
                <div className="relative w-full h-full bg-neutral-950 border border-white/10 rounded-full flex items-center justify-center shadow-2xl">
                    <MousePointer2 className="text-accent-magenta" size={44} />
                </div>
             </div>
             <h3 className="text-4xl font-black tracking-tighter uppercase italic mb-6">Initializing Grid</h3>
          </div>
        ) : (
          <SecurityMap 
            userLocation={userLocation ? [userLocation[1], userLocation[0]] : mapCenter} 
            mapCenter={mapCenter}
            zoom={zoom}
            safeZones={filteredZones}
            incidents={incidents}
            onScan={handleScanUpdate}
            onCenterChange={handleMapCenterChange}
            onZoomChange={setZoom}
          />
        )}
        
        {userLocation && (
          <div className="absolute bottom-12 right-12 z-[1000] flex flex-col gap-3 pointer-events-none">
             <button onClick={() => setZoom(prev => Math.min(prev + 1, 18))} className="w-14 h-14 bg-black/80 backdrop-blur-xl border border-white/10 text-white hover:border-green-500/50 transition-all rounded-2xl shadow-2xl pointer-events-auto flex items-center justify-center"><Plus size={20} /></button>
             <button onClick={() => setZoom(prev => Math.max(prev - 1, 3))} className="w-14 h-14 bg-black/80 backdrop-blur-xl border border-white/10 text-white hover:border-green-500/50 transition-all rounded-2xl shadow-2xl pointer-events-auto flex items-center justify-center"><Minus size={20} /></button>
             <div className="h-2" />
             <button onClick={() => setMapCenter([userLocation[1], userLocation[0]])} className="w-14 h-14 bg-green-500 text-black hover:bg-white transition-all rounded-2xl shadow-2xl pointer-events-auto flex items-center justify-center"><Compass size={24} /></button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-10 px-6 lg:px-4">
         <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight uppercase text-white">Safe <span className="text-green-500">Hubs</span></h2>
            <p className="text-neutral-600 text-[10px] font-black uppercase tracking-[0.3em]">Directory (TOP 10)</p>
         </div>
         <form onSubmit={handleGlobalSearch} className="relative w-full md:w-[450px] group/search">
            <div className="absolute -inset-1 bg-green-500/5 rounded-2xl blur-lg opacity-0 group-focus-within/search:opacity-100 transition duration-500" />
            <div className="relative flex items-center bg-black border border-white/5 rounded-2xl p-1 transition-all group-focus-within/search:border-green-500/20 shadow-2xl">
               <div className="w-10 flex justify-center text-neutral-600"><Search size={18} /></div>
               <input placeholder="SEARCH CITY OR ADDRESS..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 bg-transparent py-3 text-[11px] font-black uppercase tracking-[0.1em] text-white outline-none placeholder:text-neutral-800" />
               <button type="submit" disabled={loading} className="px-6 py-3 bg-green-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-green-500/50 hover:bg-white flex items-center gap-2 disabled:opacity-50">
                  {loading && searchTerm ? 'SYNCING...' : 'JUMP'} <ChevronRight size={14} className={loading ? 'animate-pulse' : ''} />
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
                  <tr><td colSpan={4} className="py-24 text-center text-[11px] font-black uppercase opacity-30">Scanning Grid...</td></tr>
               ) : (
                  filteredZones.slice(0, 10).map((zone) => (
                     <tr key={zone._id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => handleSelectZone(zone)}>
                        <td className="px-10 py-10">
                           <div className="flex items-center gap-6">
                              <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-white/10 flex items-center justify-center transition-all duration-500 shadow-xl group-hover:scale-110" style={{ color: zone.color || '#22c55e' }}>
                                 {zone.type.toLowerCase().includes('police') ? <Shield size={28} /> : 
                                  (zone.type.toLowerCase().includes('hospital') || zone.type.toLowerCase().includes('clinic')) ? <Stethoscope size={28} /> : 
                                  zone.type.toLowerCase().includes('pharmacy') ? <Pill size={28} /> : 
                                  <Home size={28} />}
                              </div>
                              <div>
                                 <h4 className="text-[15px] font-black text-white group-hover:text-green-500 transition-colors uppercase tracking-tight line-clamp-1">{zone.name}</h4>
                                 <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest mt-1 opacity-60 truncate max-w-sm italic">{zone.address}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-10 py-10 text-center">
                           <span className="inline-block whitespace-nowrap px-4 py-2 bg-neutral-900 text-neutral-400 text-[9px] font-black uppercase tracking-[0.2em] rounded-lg border border-white/5 min-w-[120px]">
                              {zone.type}
                           </span>
                        </td>
                        <td className="px-10 py-10 text-center text-[11px] font-black text-white">{zone.distance > 1000 ? `${(zone.distance / 1000).toFixed(1)} km` : `${Math.round(zone.distance)} m`}</td>
                        <td className="px-10 py-10 text-right">
                           <div className="flex items-center justify-end gap-3">
                              <button onClick={(e) => { e.stopPropagation(); saveHub(zone.raw); }} className="h-10 px-5 bg-green-500/10 border border-green-500/20 text-green-500 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-green-500 hover:text-white transition-all flex items-center gap-2 shadow-xl">SAVE <Plus size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleNavigate(zone); }} className="h-10 px-5 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-green-500 hover:text-white transition-all flex items-center gap-2 shadow-xl">GO <ExternalLink size={14} /></button>
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
