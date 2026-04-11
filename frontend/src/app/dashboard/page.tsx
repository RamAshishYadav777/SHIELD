'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  Users, 
  Clock, 
  ArrowRight,
  Zap,
  MessageSquare,
  Shield,
  Stethoscope,
  Activity,
  Target,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { calculateDistance } from '@/lib/utils';
import { motion } from 'framer-motion';

// ... interfaces ...
interface Prediction {
  safetyScore: number;
  riskLevel: string;
  incidentCount?: number;
  recommendation: string;
}

interface Contact {
  _id: string;
  name: string;
  relation: string;
}

export default function DashboardPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [safeHubs, setSafeHubs] = useState<any[]>([]);
  const [myReports, setMyReports] = useState<any[]>([]);
  const [nearbyCount, setNearbyCount] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>('--:-- --');
  const location = useLocation();
  const lastFetchedLocationRef = React.useRef<[number, number] | null>(null);

  useEffect(() => {
     setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
     fetchDashboardData();
  }, []);

  useEffect(() => {
     if (location) {
       let shouldFetch = false;
       
       if (!lastFetchedLocationRef.current) {
         shouldFetch = true;
       } else {
         // only refresh if user moves more than 50 meters
         const dist = calculateDistance(
           location[1], location[0],
           lastFetchedLocationRef.current[1], lastFetchedLocationRef.current[0]
         );
         if (dist > 50) shouldFetch = true;
       }

       if (shouldFetch) {
         lastFetchedLocationRef.current = location;
         fetchPrediction();
         fetchSafeHubs();
       }
     }
  }, [location]);

  // get general data for dashboard
  const fetchDashboardData = async () => {
    try {
      const [historyRes, contactsRes, reportsRes] = await Promise.all([
        api.get('/sos/history'),
        api.get('/users/contacts'),
        api.get('/incidents/my-reports')
      ]);
      setHistory(historyRes.data.data.slice(0, 3));
      setContacts(contactsRes.data.data.slice(0, 3));
      setMyReports(reportsRes.data.data.slice(0, 3));
    } catch (e: any) {
      console.error('failed to get dashboard data');
    }
  };

  const lastScanTimeRef = React.useRef<number>(0);

  // find nearby police stations and hospitals
  const fetchSafeHubs = async () => {
    if (!location) return;
    
    // rate limit search to 3 seconds
    const now = Date.now();
    if (now - lastScanTimeRef.current < 3000) return;
    lastScanTimeRef.current = now;

    try {
      // look for hubs in a 5km radius
      const offset = 0.04; 
      const bbox = `${location[1]-offset},${location[0]-offset},${location[1]+offset},${location[0]+offset}`;
      
      const q = `[out:json][timeout:15];(
        nwr["amenity"~"police|hospital|doctors|clinic",i](${bbox});
        nwr["office"~"police|security",i](${bbox});
        nwr["emergency"~"police|ambulance|sos",i](${bbox});
      );out center;`;
      
      const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('OSM down');
      const data = await res.json();
      
      if (data.elements) {
        const sorted = data.elements
          .map((s: any) => {
            const lat = s.center ? s.center.lat : s.lat;
            const lon = s.center ? s.center.lon : s.lon;
            const dist = calculateDistance(location[1], location[0], lat, lon);
            const fullTags = JSON.stringify(s.tags || {}).toLowerCase();
            const isPolice = /police|security|chowki/.test(fullTags);
            
            return {
              id: s.id,
              name: s.tags.name || (isPolice ? 'Police Station' : 'Health Center'),
              type: isPolice ? 'Police' : 'Hospital',
              distance: dist,
              lat, lon
            };
          })
          .sort((a: any, b: any) => a.distance - b.distance)
          .slice(0, 5);
          
        setSafeHubs(sorted);
        setNearbyCount(data.elements.length);
      }
    } catch (e) {
      // ignore errors
    }
  };

  // get safety score prediction
  const fetchPrediction = async () => {
    if (!location || !location[0] || !location[1]) return;
    try {
      const res = await api.get(`/incidents/prediction?lng=${location[0]}&lat=${location[1]}`);
      setPrediction(res.data.data);
    } catch (e: any) {
      console.error('failed to get safety score');
    } finally {
      setLoading(false);
    }
  };

  // call for help
  const handleSOS = async () => {
    if (!location) {
       toast.error('CANT GET LOCATION - CANT CALL SOS');
       return;
    }

    toast.loading('SENDING SOS...', { id: 'sos-toast' });
    
    let address = 'Current Location';
    try {
      // get readable address from coordinates
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location[1]}&lon=${location[0]}&zoom=18&addressdetails=1`, {
        headers: { 'User-Agent': 'SHIELD-Safety-App' }
      });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        address = geoData.display_name?.split(',').slice(0, 3).join(',') || 'Current Location';
      }
    } catch (e) {
      console.warn('geocoding slow/failed');
    }

    try {
      await api.post('/sos/trigger', {
        coordinates: location,
        address,
        message: 'I need help!'
      });
      toast.success('SOS SENT!', { id: 'sos-toast', duration: 5000, icon: '🚨' });
      fetchDashboardData(); 
    } catch (e: any) {
      toast.error('SOS FAILED - TRY AGAIN', { id: 'sos-toast' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-20">
      
      {/* safety score card */}
      <Card className="p-8 border-white/5 bg-[#120B16] bg-gradient-to-r from-[#120B16] to-[#1D1024] rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 h-full shadow-2xl overflow-hidden relative border-none">
        
        <div className="flex items-center gap-8 w-full">
          <div className="relative flex items-center justify-center shrink-0">
             <motion.div
               animate={(!location || !prediction) ? { rotate: 360 } : { rotate: 0 }}
               transition={(!location || !prediction) ? { duration: 4, repeat: Infinity, ease: "linear" } : { duration: 0.5 }}
               className="relative"
             >
               <svg className="w-28 h-28 transform -rotate-90">
                 <circle cx="56" cy="56" r="48" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
                 <circle 
                   cx="56" 
                   cy="56" 
                   r="48" 
                   stroke="#F4821F" 
                   strokeWidth="8" 
                   fill="none" 
                   strokeDasharray="301.59" 
                   strokeDashoffset={301.59 - (301.59 * (prediction?.safetyScore || 75)) / 100} 
                   className="transition-all duration-1000 ease-out" 
                   strokeLinecap="round" 
                 />
               </svg>
             </motion.div>
             <div className="absolute font-bold text-3xl text-accent-orange">
               {prediction ? prediction.safetyScore : '--'}
             </div>
          </div>

          <div className="space-y-3 flex-1">
             <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-[#2C1D14] text-[#C6783A] text-xs font-bold rounded-full border border-[#C6783A]/30">SAFETY LEVEL</span>
                <span className="flex items-center gap-1.5 text-xs text-text-secondary font-bold">
                  <Clock size={12} /> {currentTime}
                </span>
             </div>
             <h2 className="text-3xl font-bold flex items-center gap-3 text-white">
                {prediction ? prediction.riskLevel : 'Analyzing'} Status <Zap className={`text-accent-orange ${prediction ? 'fill-accent-orange' : 'animate-pulse'}`} size={22} />
             </h2>
             <p className={`text-sm font-medium max-w-xl italic ${prediction ? 'text-text-secondary' : 'text-text-secondary/50 animate-pulse'}`}>
                "{prediction ? prediction.recommendation : 'Scanning for safety threats...'}"
             </p>
          </div>
        </div>

        <button 
           onClick={() => router.push('/dashboard/map')}
           className="shrink-0 px-8 py-4 bg-gradient-to-r from-[#F4821F] to-[#D10B66] text-white font-bold text-sm tracking-wide rounded-2xl shadow-[0_0_30px_rgba(209,11,102,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 z-10"
        >
           SHOW MAP <ArrowRight size={18} />
        </button>
      </Card>

      {/* big sos button card */}
      <Card className="p-10 md:p-14 border-white/5 bg-[#0F0C13] rounded-[3rem] overflow-hidden relative shadow-2xl flex flex-col md:flex-row items-center justify-between gap-12 border-none">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D10B66]/10 blur-[130px] rounded-full pointer-events-none"></div>

        <div className="space-y-8 relative z-10 max-w-xl flex-1">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            SOS Lifeline
          </h1>
          <p className="text-neutral-400 text-base md:text-lg leading-relaxed font-medium">
            Emergency help is one tap away. Notifies your contacts and nearby admins instantly.
          </p>
          
          <div className="flex items-center gap-6 pt-6">
             <div className="flex -space-x-4">
                {contacts.length > 0 ? contacts.slice(0, 4).map((c, i) => (
                   <div key={i} className="w-12 h-12 rounded-full border-2 border-[#0F0C13] bg-transparent flex items-center justify-center text-white font-bold text-sm shadow-xl z-[4] relative outline outline-1 outline-white/20 uppercase tracking-widest">
                      {c.name.charAt(0)}
                   </div>
                )) : (
                   ['A', 'B', 'C', 'D'].map((letter, i) => (
                    <div key={i} className="w-12 h-12 rounded-full border-2 border-[#0F0C13] bg-transparent flex items-center justify-center text-white font-bold text-sm shadow-xl z-[4] relative outline outline-1 outline-white/20 uppercase tracking-widest">
                      {letter}
                    </div>
                  ))
                )}
             </div>
             <div>
                <p className="font-bold text-white text-sm tracking-wide uppercase">{contacts.length || 1} EMERGENCY CONTACTS</p>
                <p className="text-[11px] text-neutral-500 font-medium">Synced and ready</p>
             </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-center md:justify-end flex-1">
            <div className="relative flex items-center justify-center">
               <div className="absolute inset-4 rounded-full border-4 border-[#D10B66]/60 animate-[ripple_3s_ease-out_infinite]" />
               <div className="absolute inset-4 rounded-full border-4 border-[#D10B66]/40 animate-[ripple_3s_ease-out_infinite_1.5s]" />
               
               <button 
                 onClick={handleSOS}
                 className="relative w-64 h-64 md:w-80 md:h-80 rounded-full shadow-[0_0_80px_rgba(209,11,102,0.6)] flex flex-col items-center justify-center active:scale-95 transition-all outline-none cursor-pointer group animate-[sosBreath_3s_ease-in-out_infinite] border-[8px] border-[#1D0C14] bg-gradient-to-br from-[#FF1A66] to-[#af0854]"
               >
                 <div className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />
                 <AlertTriangle size={72} className="text-white mb-2 stroke-[2.5] group-hover:scale-110 group-hover:-translate-y-2 transition-transform duration-500 drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]" />
                 <span className="text-white font-black text-4xl tracking-[0.25em] drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]">SOS</span>
               </button>
            </div>
        </div>
      </Card>

      {/* my incident reports */}
      {myReports.length > 0 && (
        <Card className="p-8 border-white/5 bg-[#0F0C13] rounded-[2.5rem] shadow-2xl border-none">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold flex items-center gap-3 text-white italic transition-all group">
              <Shield size={24} className="text-accent-orange group-hover:rotate-12 duration-500" /> 
              My Reported Incidents
            </h3>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 italic">Live Tracking</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myReports.map((report) => (
              <div key={report._id} className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent-orange/5 blur-2xl pointer-events-none group-hover:bg-accent-orange/10 transition-colors" />
                <div className="flex flex-col gap-4 relative z-10">
                   <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-white/[0.05] text-white/40 text-[9px] font-black uppercase tracking-widest rounded-full">{report.category}</span>
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                        report.isVerified 
                          ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                          : 'bg-accent-orange/10 text-accent-orange border-accent-orange/20 animate-pulse'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${report.isVerified ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-accent-orange shadow-[0_0_8px_#F4821F]'}`} />
                        {report.isVerified ? 'Approved' : 'Pending'}
                      </div>
                   </div>
                   <div>
                      <h4 className="font-bold text-white text-base truncate">{report.title}</h4>
                      <p className="text-xs text-text-secondary mt-1 line-clamp-1">{report.location?.address || 'Unknown Location'}</p>
                   </div>
                   <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                      <span className="text-[10px] text-text-secondary font-medium tracking-wide">
                        {new Date(report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                      <motion.button 
                        whileHover={{ scale: 1.1, x: 2 }}
                        className="text-accent-orange hover:text-white transition-all"
                      >
                         <ArrowUpRight size={18} />
                      </motion.button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* contact list and nearby hubs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Contact List */}
         <Card className="p-8 bg-neutral-900 border-white/5 rounded-[2.5rem] shadow-2xl border-none">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-white">
               <Users size={24} className="text-accent-orange" /> My Circle
            </h3>
            <div className="space-y-4">
               {contacts.length > 0 ? (
                 contacts.map((contact, i) => (
                  <div key={contact._id} className="flex items-center justify-between group p-2 hover:bg-white/[0.02] rounded-xl transition-all">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center font-bold text-xl text-white">
                           {contact.name.charAt(0)}
                        </div>
                        <div>
                           <p className="font-semibold text-sm text-white">{contact.name}</p>
                           <span className="text-xs text-text-secondary">{contact.relation}</span>
                        </div>
                     </div>
                     <button className="p-3 rounded-xl bg-white/5 text-text-secondary hover:text-white transition-all">
                        <MessageSquare size={18} />
                     </button>
                  </div>
                ))
               ) : (
                  <div className="text-center py-6 text-text-secondary text-sm">No contacts added yet.</div>
               )}
               <button 
                  onClick={() => router.push('/dashboard/contacts')}
                  className="w-full mt-6 h-14 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold text-white transition-all"
               >
                  <Plus size={18} /> Add Contact
               </button>
            </div>
         </Card>

         {/* Nearby Safe Hubs */}
         <Card className="p-8 bg-neutral-900 border-white/5 rounded-[2.5rem] shadow-2xl border-none">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-white">
               <Target size={24} className="text-green-500" /> Nearby Hubs
            </h3>
            <div className="space-y-4">
              {safeHubs.length > 0 ? (
                safeHubs.slice(0, 5).map((hub) => (
                  <div key={hub.id} className="flex items-center justify-between group p-2 hover:bg-white/[0.02] rounded-xl transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-green-500">
                          {hub.type === 'Police' ? <Shield size={18} /> : <Stethoscope size={18} />}
                       </div>
                       <div>
                          <p className="font-semibold text-sm text-white line-clamp-1 max-w-[140px]">{hub.name}</p>
                          <p className="text-xs text-text-secondary">{hub.type}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-bold text-white">{(hub.distance * 1000).toFixed(0)}m</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-text-secondary text-sm">Scanning area...</div>
              )}
              
              <button 
                onClick={() => router.push('/dashboard/map')}
                className="w-full mt-4 h-14 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all"
              >
                View Full Map <ArrowRight size={18} />
              </button>
            </div>
         </Card>
      </div>

    </div>
  );
}
