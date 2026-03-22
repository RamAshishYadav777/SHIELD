'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
  BarChart3, 
  Map as MapIcon, 
  TrendingUp, 
  AlertTriangle,
  Users,
  Calendar,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Card } from '@/components/ui';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

const SafetyMap = dynamic(() => import('@/components/admin/SafetyMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-black/40 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Initializing Neural Link...</div>
});

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [incidents, setIncidents] = useState([]);
  const [safeZones, setSafeZones] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, zones: 0 });
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);
  const [searchPos, setSearchPos] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState(12);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [newZone, setNewZone] = useState({ name: '', type: 'Police Station', address: '' });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [incRes, zoneRes] = await Promise.all([
        api.get('/incidents'),
        api.get('/safezones')
      ]);
      
      const incData = incRes.data.data;
      const zoneData = zoneRes.data.data;
      
      setIncidents(incData);
      setSafeZones(zoneData);
      setStats({
        total: incData.length,
        verified: incData.filter((i: any) => i.isVerified).length,
        zones: zoneData.length
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const coords: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setSearchPos(coords);
        setMapCenter(coords);
        setMapZoom(16);
      } else {
        toast.error('Location not found.');
      }
    } catch (error) {
      toast.error('Search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleZoomTo = (coords: [number, number]) => {
    setMapCenter(coords);
    setMapZoom(16);
  };

  const handleAddZone = async () => {
    if (!selectedPos || !newZone.name) {
      toast.error('Please name the zone and pick a map point.');
      return;
    }

    try {
      await api.post('/safezones', {
        name: newZone.name,
        type: newZone.type,
        address: newZone.address,
        location: {
          type: 'Point',
          coordinates: [selectedPos[1], selectedPos[0]] // [lng, lat]
        }
      });
      toast.success('Safe Zone Registered!');
      setIsAdding(false);
      setSelectedPos(null);
      setNewZone({ name: '', type: 'Police Station', address: '' });
      fetchAll();
    } catch (error) {
      toast.error('Failed to create zone.');
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <BarChart3 className="text-accent-magenta" />
            SAFETY <span className="text-accent-magenta italic">MAP</span>
          </h1>
          <p className="text-text-secondary mt-1 font-bold text-xs uppercase tracking-widest">Register and manage verified clear zones.</p>
        </div>
        
        <div className="flex gap-4">
           <button 
             onClick={() => setIsAdding(!isAdding)}
             className={`shrink-0 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl ${isAdding ? 'bg-red-500 text-white' : 'bg-primary text-white hover:shadow-[0_0_30px_rgba(244,130,31,0.3)] hover:scale-105 active:scale-95'}`}
           >
             {isAdding ? 'Cancel' : 'Register Zone'}
           </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-8 border-l-4 border-accent-magenta bg-accent-magenta/5">
           <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-magenta">Threat Reports</span>
              <AlertTriangle size={16} className="text-accent-magenta" />
           </div>
           <p className="text-4xl font-black tracking-tighter">{stats.total}</p>
        </Card>
        <Card className="p-8 border-l-4 border-green-500 bg-green-500/5">
           <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500">Clear Zones</span>
              <ShieldCheck size={16} className="text-green-500" />
           </div>
           <p className="text-4xl font-black tracking-tighter">{stats.zones}</p>
        </Card>
        <Card className="p-8 border-l-4 border-accent-orange bg-accent-orange/5">
           <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-orange">Verified Incidents</span>
              <Users size={16} className="text-accent-orange" />
           </div>
           <p className="text-4xl font-black tracking-tighter">{stats.verified}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-0 overflow-hidden relative border-white/5 bg-black h-[650px] rounded-[3rem]">
          {/* OVERLAY CONTROLS */}
          <div className="absolute top-6 left-6 right-6 z-[1000] flex flex-col md:flex-row items-center gap-4">
              <form onSubmit={handleSearch} className="flex items-center bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-1 w-full md:w-96 focus-within:border-primary/50 transition-all shadow-2xl">
                <input 
                    type="text" 
                    placeholder="Search city, street or hospital..."
                    className="bg-transparent border-none outline-none px-4 py-2 text-xs text-white w-full placeholder:text-neutral-600 font-bold"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                <button 
                    type="submit" 
                    disabled={isSearching}
                    className="bg-white text-black text-[9px] font-black uppercase px-6 py-3 rounded-xl hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                >
                    {isSearching ? 'FINDING...' : 'SEARCH'}
                </button>
              </form>

              {isAdding && (
                <div className="bg-primary/90 backdrop-blur-md px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest text-white border border-white/20 animate-pulse shadow-2xl">
                  Click Map to Select Point
                </div>
              )}
          </div>
          
          <SafetyMap 
            incidents={incidents}
            safeZones={safeZones}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
            isAdding={isAdding}
            selectedPos={selectedPos}
            searchPos={searchPos}
            onMapClick={setSelectedPos}
          />
        </Card>

        <div className="space-y-6">
          {isAdding ? (
            <Card className="p-8 space-y-6 bg-white/[0.02] border-primary/20 rounded-[2.5rem] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
               <h3 className="text-xl font-black tracking-tight uppercase">Register <span className="text-primary italic">Safe Zone</span></h3>
               <div className="space-y-4 relative z-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest pl-2">Zone Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. City General Hospital"
                      className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm focus:border-primary transition-all outline-none"
                      value={newZone.name}
                      onChange={e => setNewZone({ ...newZone, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest pl-2">Zone Type</label>
                    <select 
                      className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm focus:border-primary transition-all outline-none"
                      value={newZone.type}
                      onChange={e => setNewZone({ ...newZone, type: e.target.value })}
                    >
                      <option value="Police Station">Police Station</option>
                      <option value="Hospital">Hospital</option>
                      <option value="Public Booth">Public Booth</option>
                      <option value="Verified Store">Verified Store</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest pl-2">Address (Optional)</label>
                    <input 
                      type="text" 
                      className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm focus:border-primary outline-none"
                      value={newZone.address}
                      onChange={e => setNewZone({ ...newZone, address: e.target.value })}
                    />
                  </div>
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                     <p className="text-[10px] font-bold text-primary uppercase">Selected Coords:</p>
                     <p className="text-xs font-mono text-neutral-400 mt-1">
                        {selectedPos ? `${selectedPos[0].toFixed(4)}, ${selectedPos[1].toFixed(4)}` : 'Wait for map click...'}
                     </p>
                  </div>
                  <button 
                    onClick={handleAddZone}
                    className="w-full py-4 bg-primary text-white font-black uppercase text-xs tracking-widest rounded-xl hover:shadow-[0_0_30px_rgba(244,130,31,0.3)] transition-all active:scale-95"
                  >
                    Authorize Zone
                  </button>
               </div>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="p-8 space-y-6 bg-white/[0.01] border-white/5 rounded-[2.5rem]">
                 <h3 className="text-lg font-black tracking-tight uppercase flex items-center gap-3">
                   <TrendingUp size={20} className="text-accent-magenta" /> Recent <span className="text-accent-magenta italic">Points</span>
                 </h3>
                 <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {safeZones.length === 0 ? (
                      <div className="py-20 text-center text-[10px] font-black uppercase text-neutral-600 italic tracking-[0.2em]">No verified zones.</div>
                    ) : (
                      safeZones.slice(0, 10).map((zone: any) => (
                        <div 
                          key={zone._id} 
                          onClick={() => handleZoomTo([zone.location.coordinates[0], zone.location.coordinates[1]])}
                          className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-primary/30 transition-all cursor-pointer"
                        >
                           <div className="flex items-center justify-between mb-1">
                              <span className="text-[8px] font-black uppercase text-green-500 tracking-[0.3em] font-mono">{zone.type}</span>
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                           </div>
                           <h4 className="font-black text-xs text-white uppercase">{zone.name}</h4>
                           <p className="text-[9px] text-neutral-500 font-bold mt-1 uppercase truncate">{zone.address || 'Verified Hub'}</p>
                        </div>
                      ))
                    )}
                 </div>
              </Card>

              <Card className="p-8 space-y-6 bg-white/[0.01] border-white/5 rounded-[2.5rem]">
                 <h3 className="text-lg font-black tracking-tight uppercase flex items-center gap-3">
                   <AlertTriangle size={20} className="text-accent-orange" /> Recent <span className="text-accent-orange italic">Incidents</span>
                 </h3>
                 <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {incidents.slice(0, 5).map((inc: any) => (
                      <div 
                        key={inc._id} 
                        onClick={() => handleZoomTo([inc.location.coordinates[0], inc.location.coordinates[1]])}
                        className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-accent-orange/30 transition-all cursor-pointer"
                      >
                         <div className="flex items-center justify-between mb-1">
                            <span className="text-[8px] font-black uppercase text-accent-orange tracking-[0.3em] font-mono">{inc.category}</span>
                            <span className={`w-2 h-2 rounded-full ${inc.isVerified ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                         </div>
                         <h4 className="font-black text-xs text-white uppercase">{inc.title}</h4>
                         <p className="text-[9px] text-neutral-500 font-bold mt-1 uppercase truncate">{inc.address || 'Global Threat'}</p>
                      </div>
                    ))}
                 </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
