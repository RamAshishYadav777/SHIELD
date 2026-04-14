'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, AlertTriangle, Activity,
  Zap, ArrowRight, Mail, Phone,
  Shield, Copy, Check
} from 'lucide-react';
import { Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import Link from 'next/link';
import { useSocket } from '@/hooks/useSocket';
import toast from 'react-hot-toast';

// rows
const SOSRow = React.memo(({ sos, onRescueInfo }: { sos: any, onRescueInfo: (user: any) => void }) => (
  <div className="p-6 flex flex-col xl:flex-row xl:items-center justify-between group hover:bg-white/[0.02] transition-colors border-l-4 border-transparent hover:border-red-500 will-change-transform">
      <div className="flex items-center gap-4 flex-1 mb-4 xl:mb-0">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <Activity size={24} />
          </div>
          <div>
              <p className="font-black text-white uppercase tracking-tight italic text-xl leading-none">
                SOS: <span className="text-red-500">{sos.user?.name || 'Unknown User'}</span>
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[9px] text-red-500 font-black uppercase tracking-widest">Live Signal</span>
                </div>
                <div className="h-5 w-px bg-white/10" />
                <div className="flex flex-col justify-center leading-none">
                    <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-[0.1em] mb-1">{new Date(sos.createdAt).toLocaleDateString()}</span>
                    <span className="text-[11px] text-neutral-300 font-black tracking-tighter uppercase">{new Date(sos.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
          </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 xl:ml-auto">
          {(sos.address || sos.location?.address) && (
              <div className="flex items-center gap-2 text-xs font-black text-white bg-white/10 px-4 py-2 rounded-xl border border-white/10 shadow-xl max-w-[250px] truncate">
                  <span className="opacity-40 uppercase italic text-[10px]">Loc</span>
                  {sos.address || sos.location.address}
              </div>
          )}
          <div className="flex items-center gap-0.5 group/copy relative shadow-xl">
              <div className="flex items-center gap-2 text-xs font-mono font-black text-white bg-white/10 px-4 py-2 rounded-l-xl border border-white/10 border-r-0">
                  <span className="opacity-40 uppercase text-[10px]">GPS</span>
                  {sos.location?.coordinates[1]?.toFixed(6)}, {sos.location?.coordinates[0]?.toFixed(6)}
              </div>
              <button 
                  onClick={() => {
                      const coords = `${sos.location?.coordinates[1]},${sos.location?.coordinates[0]}`;
                      navigator.clipboard.writeText(coords);
                      toast.success('Coordinates copied!');
                  }}
                  className="p-2.5 bg-white/20 border border-white/10 rounded-r-xl text-white hover:bg-neutral-900 hover:text-white transition-all"
              >
                  <Copy size={14} />
              </button>
          </div>

          <button 
            onClick={() => onRescueInfo(sos.user)}
            className="h-10 px-6 bg-red-500/20 border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg flex items-center gap-2"
          >
            <Users size={14} />
            RESCUE INFO
          </button>
      </div>
  </div>
));

const IncidentRow = React.memo(({ inc }: { inc: any }) => (
  <div className="p-6 flex items-center justify-between group hover:bg-white/[0.03] transition-colors will-change-transform">
      <div className="flex items-center gap-4">
          <div className={`w-2 h-2 rounded-full ${inc.isVerified ? 'bg-green-500' : 'bg-accent-orange animate-pulse'}`} />
          <div>
              <p className="font-semibold text-white tracking-wide uppercase italic text-sm">{inc.title}</p>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1 italic">
                {inc.category} • {new Date(inc.createdAt).toLocaleString()}
              </p>
              {inc.location?.address && (
                <p className="text-[9px] font-bold text-neutral-400 mt-1 uppercase tracking-tighter">
                  Loc: {inc.location.address}
                </p>
              )}
          </div>
      </div>
      <Link href="/admin/incidents" className="p-2 rounded-xl bg-white/5 text-text-secondary group-hover:bg-accent-orange group-hover:text-white transition-all active:scale-95">
        <ArrowRight size={16} />
      </Link>
  </div>
));

export default function AdminDashboardPage() {
  const { socket } = useSocket();
  const [stats, setStats] = useState({
    totalUsers: 0, totalIncidents: 0, verifiedIncidents: 0, 
    totalSOS: 0, totalSafeZones: 0, totalRevenue: 0
  });
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [recentSOS, setRecentSOS] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSOSUser, setSelectedSOSUser] = useState<any>(null);
  
  // guard
  const lastFetchRef = useRef(0);

  const fetchAll = useCallback(async (isAuto = false) => {
    // throttle
    const now = Date.now();
    if (!isAuto && now - lastFetchRef.current < 2500) return;
    lastFetchRef.current = now;

    try {
      const [incRes, sosRes, zoneRes, userRes, payRes] = await Promise.all([
        api.get('/incidents').catch(() => ({ data: { data: [] } })),
        api.get('/sos/admin/history').catch(() => ({ data: { data: [] } })),
        api.get('/safezones/nearby?lng=0&lat=0&distance=999999').catch(() => ({ data: { count: 0 } })),
        api.get('/admin/all').catch(() => ({ data: { count: 0, data: [] } })),
        api.get('/payments/admin/all').catch(() => ({ data: { data: [], totalAmount: 0 } })),
      ]);

      const incidents = incRes.data.data || [];
      const sosList = sosRes.data.data || [];
      const userList = userRes.data.data || [];
      const paymentList = payRes.data.data || [];

      setStats({
        totalUsers: userRes.data.count || userList.length,
        totalIncidents: incidents.length,
        verifiedIncidents: incidents.filter((i: any) => i.isVerified).length,
        totalSOS: sosList.length,
        totalSafeZones: zoneRes.data.count || 0,
        totalRevenue: payRes.data.totalAmount || 0,
      });

      setRecentIncidents(incidents.slice(0, 5));
      setRecentSOS(sosList.slice(0, 5));
    } catch (e) {
      console.error('Admin dashboard fetch failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(true);
    const interval = setInterval(() => fetchAll(true), 60000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // socket listener
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchAll();
    socket.on('system-alert', handleUpdate);
    socket.on('new-sos', handleUpdate);
    socket.on('incident-update', handleUpdate);
    return () => {
      socket.off('system-alert', handleUpdate);
      socket.off('new-sos', handleUpdate);
      socket.off('incident-update', handleUpdate);
    };
  }, [socket, fetchAll]);

  const dashboardStats = useMemo(() => [
    { label: 'Active Incidents', value: stats.totalIncidents, icon: AlertTriangle, color: 'from-accent-orange/20 to-accent-orange/5', iconColor: 'text-accent-orange' },
    { label: 'System Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: Zap, color: 'from-accent-magenta/20 to-accent-magenta/5', iconColor: 'text-accent-magenta' },
    { label: 'SOS Triggers', value: stats.totalSOS, icon: Activity, color: 'from-blue-500/20 to-blue-600/5', iconColor: 'text-blue-500' },
    { label: 'Active Users', value: stats.totalUsers, icon: Users, color: 'from-green-500/20 to-green-600/5', iconColor: 'text-green-500' },
  ], [stats]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 px-4 sm:px-0">
      {/* head */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">Platform Overview</h1>
          <p className="text-text-secondary text-xs md:text-sm">Manage global safety metrics and live emergency feeds.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] md:text-xs font-black text-text-secondary tracking-[0.2em] uppercase">Status: Live</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-[10px] md:text-xs font-mono font-bold text-white/30 tracking-tighter">
              SYNC_{new Date().toLocaleTimeString()}
            </span>
        </motion.div>
      </div>

      {/* status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="will-change-transform"
          >
            <Card className={`p-6 bg-gradient-to-br ${stat.color} border-white/10 relative overflow-hidden h-full rounded-[2rem]`}>
                <div className="relative z-10">
                    <div className={`w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center ${stat.iconColor} mb-4 shadow-xl`}>
                        <stat.icon size={16} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary mb-1 italic opacity-60">{stat.label}</p>
                    <h3 className="text-2xl font-black text-white tracking-tighter">
                        {loading ? <div className="h-8 w-16 bg-white/10 animate-pulse rounded-lg" /> : stat.value}
                    </h3>
                </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* sos */}
      <Card className="p-0 border-red-500/20 overflow-hidden rounded-[2.5rem] bg-red-900/5 backdrop-blur-xl relative shadow-2xl">
          <div className="p-6 border-b border-red-500/10 flex items-center justify-between bg-red-500/5">
              <h2 className="text-lg font-bold flex items-center gap-3 text-red-500 italic">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                 TACTICAL SOS FEED
              </h2>
          </div>
          <div className="divide-y divide-white/5">
              {recentSOS.map((sos) => (
                  <SOSRow key={sos._id} sos={sos} onRescueInfo={setSelectedSOSUser} />
              ))}
              {recentSOS.length === 0 && !loading && (
                 <div className="p-12 text-center text-neutral-600 text-[10px] font-black uppercase tracking-[0.3em] font-mono italic">Listening for emergency signals...</div>
              )}
          </div>
      </Card>

      {/* incidents */}
      <Card className="p-0 border-white/10 overflow-hidden rounded-[2.5rem] bg-neutral-900/40 backdrop-blur-xl">
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-lg font-bold flex items-center gap-2 uppercase tracking-tight">
                 <Shield className="text-accent-orange" size={20} /> Security <span className="text-neutral-500">Incident Pulse</span>
              </h2>
          </div>
          <div className="divide-y divide-white/5">
              {recentIncidents.map((inc) => (
                  <IncidentRow key={inc._id} inc={inc} />
              ))}
              {recentIncidents.length === 0 && !loading && (
                 <div className="p-12 text-center text-neutral-600 text-[10px] font-black uppercase tracking-[0.3em] font-mono italic">No recent system reports found.</div>
              )}
          </div>
      </Card>

      {/* modal */}
      <AnimatePresence>
        {selectedSOSUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-2xl" 
              onClick={() => setSelectedSOSUser(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="relative bg-neutral-900 border border-red-500/20 rounded-[2.5rem] p-8 md:p-10 max-w-lg w-full overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-accent-magenta to-red-500" />
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-6">CRISIS <span className="text-red-500">DOSSIER</span></h3>
              
              <div className="p-6 md:p-8 bg-white/5 border border-white/10 rounded-[2.5rem]">
                <h4 className="text-xl font-black text-white mb-6 uppercase tracking-tight text-center">{selectedSOSUser?.name}</h4>
                <div className="space-y-4 text-center">
                  <div className="flex flex-col items-center gap-2 p-5 bg-white/[0.02] rounded-2xl border border-white/5">
                    <Mail size={16} className="text-red-500" />
                    <span className="text-xs font-bold text-neutral-400 truncate w-full">{selectedSOSUser?.email}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-6 bg-white/[0.04] rounded-2xl border border-red-500/10">
                    <Phone size={24} className="text-red-500" />
                    <span className="text-2xl font-black text-white tracking-widest leading-none">
                      {selectedSOSUser?.phone || 'UNREGISTERED'}
                    </span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedSOSUser(null)} 
                className="mt-8 w-full py-5 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-white rounded-2xl transition-all border border-white/5 hover:border-red-500/20"
              >
                SECURE RECORD
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
