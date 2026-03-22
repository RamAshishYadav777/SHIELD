'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
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

  useEffect(() => {
    fetchAll();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  // Listen for real-time SOS and incidents
  useEffect(() => {
    if (!socket) return;

    const handleRealtimeUpdate = () => {
      console.log('Real-time alert received, refreshing dashboard stats...');
      fetchAll();
    };

    socket.on('system-alert', handleRealtimeUpdate);
    socket.on('new-sos', handleRealtimeUpdate);
    socket.on('incident-update', handleRealtimeUpdate);

    return () => {
      socket.off('system-alert', handleRealtimeUpdate);
      socket.off('new-sos', handleRealtimeUpdate);
      socket.off('incident-update', handleRealtimeUpdate);
    };
  }, [socket]);

  const fetchAll = async () => {
    try {
      const [incRes, sosRes, zoneRes, userRes, payRes] = await Promise.all([
        api.get('/incidents').catch(() => ({ data: { data: [] } })),
        api.get('/sos/admin/history').catch(() => ({ data: { data: [] } })),
        api.get('/safezones/nearby?lng=0&lat=0&distance=999999').catch(() => ({ data: { count: 0 } })),
        api.get('/users/admin/all').catch(() => ({ data: { count: 0, data: [] } })),
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
  };

  // Merge incidents and SOS triggers for the pulse feed
  const pulseFeed = useMemo(() => {
    const items = [
      ...recentIncidents.map(inc => ({ ...inc, feedType: 'incident' })),
      ...recentSOS.map(sos => ({ ...sos, feedType: 'sos', title: `SOS: ${sos.user?.name || 'Unknown User'}` }))
    ];
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);
  }, [recentIncidents, recentSOS]);

  const dashboardStats = useMemo(() => [
    { label: 'Active Incidents', value: stats.totalIncidents, icon: AlertTriangle, color: 'from-accent-orange/20 to-accent-orange/5', iconColor: 'text-accent-orange' },
    { label: 'System Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: Zap, color: 'from-accent-magenta/20 to-accent-magenta/5', iconColor: 'text-accent-magenta' },
    { label: 'SOS Triggers', value: stats.totalSOS, icon: Activity, color: 'from-blue-500/20 to-blue-600/5', iconColor: 'text-blue-500' },
    { label: 'Active Nodes', value: stats.totalUsers, icon: Users, color: 'from-green-500/20 to-green-600/5', iconColor: 'text-green-500' },
  ], [stats]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Platform Overview</h1>
          <p className="text-text-secondary text-sm">Monitor system performance, global safety metrics, and platform usage.</p>
        </div>

        <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-semibold text-text-secondary">System Live</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-sm font-semibold text-white/80">
              Last Sync: {pulseFeed[0] ? new Date(pulseFeed[0].createdAt).toLocaleTimeString() : new Date().toLocaleTimeString()}
            </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={`p-6 bg-gradient-to-br ${stat.color} border-white/10 relative overflow-hidden h-full rounded-[2rem]`}>
                <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className={`w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center ${stat.iconColor}`}>
                        <stat.icon size={20} />
                    </div>
                </div>
                <div className="relative z-10">
                    <p className="text-sm font-semibold text-text-secondary mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-bold text-white mb-2">
                        {loading ? <div className="h-8 w-16 bg-white/10 animate-pulse rounded-lg" /> : stat.value}
                    </h3>
                </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── LIVE SOS ACTIVITY ── */}
      <Card className="p-0 border-red-500/20 overflow-hidden rounded-[2.5rem] bg-red-900/5 backdrop-blur-xl shadow-2xl relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl pointer-events-none" />
          <div className="p-6 border-b border-red-500/10 flex items-center justify-between bg-red-500/5">
              <h2 className="text-lg font-bold flex items-center gap-3 text-red-500">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                 LIVE SOS ACTIVITY
              </h2>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/60 leading-none">Emergency Channel</span>
          </div>
          <div className="divide-y divide-white/5">
              {recentSOS.map((sos) => (
                  <div key={sos._id} className="p-6 flex items-center justify-between group hover:bg-white/[0.02] transition-colors border-l-4 border-transparent hover:border-red-500">
                      <div className="flex items-center gap-4 flex-1">
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

                      {/* TACTICAL LOCATION DATA */}
                      <div className="flex items-center gap-3 ml-auto">
                          {(sos.address || sos.location?.address) && (
                              <div className="flex items-center gap-2 text-xs font-black text-white bg-white/10 px-4 py-2 rounded-xl border border-white/10 shadow-xl">
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
                                      toast.success('Coordinates copied!', {
                                          style: { background: '#171717', color: '#ef4444', border: '1px solid #ef4444', fontWeight: 'bold' }
                                      });
                                  }}
                                  className="p-2.5 bg-white/20 border border-white/10 rounded-r-xl text-white hover:bg-red-500 hover:text-white transition-all active:scale-95"
                                  title="Copy Coordinates"
                              >
                                  <Copy size={14} />
                              </button>
                          </div>

                          <button 
                            onClick={() => setSelectedSOSUser(sos.user)}
                            className="h-10 px-6 bg-red-500/20 border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg flex items-center gap-2"
                          >
                            <Users size={14} />
                            RESCUE INFO
                          </button>
                      </div>
                  </div>
              ))}
              {recentSOS.length === 0 && !loading && (
                 <div className="p-12 text-center text-neutral-600 text-[10px] font-black uppercase tracking-[0.3em] font-mono italic">No active SOS signals monitored.</div>
              )}
          </div>
      </Card>

      {/* ── SECURITY INCIDENT PULSE ── */}
      <Card className="p-0 border-white/10 overflow-hidden rounded-[2.5rem] bg-neutral-900/40 backdrop-blur-xl shadow-2xl">
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-lg font-bold flex items-center gap-2 uppercase tracking-tight">
                 <Shield className="text-accent-orange" size={20} /> Security <span className="text-neutral-500">Incident Pulse</span>
              </h2>
              <Link href="/admin/incidents" className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-orange hover:text-white transition-colors flex items-center gap-2">
                All Reports <ArrowRight size={14} />
              </Link>
          </div>
          <div className="divide-y divide-white/5">
              {recentIncidents.map((inc) => (
                  <div key={inc._id} className="p-6 flex items-center justify-between group hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${inc.isVerified ? 'bg-green-500' : 'bg-accent-orange animate-pulse'}`} />
                          <div>
                              <p className="font-semibold text-white tracking-wide uppercase italic text-sm">{inc.title}</p>
                              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1 italic">
                                {inc.category} • {new Date(inc.createdAt).toLocaleString()}
                              </p>
                              {inc.location?.address ? (
                                <p className="text-[9px] font-bold text-neutral-400 mt-1 uppercase tracking-tighter">
                                  Loc: {inc.location.address}
                                </p>
                              ) : inc.location?.coordinates && (
                                <p className="text-[9px] font-mono text-neutral-600 mt-1 uppercase font-bold tracking-tighter">
                                  GPS: {inc.location.coordinates[1]?.toFixed(6)}, {inc.location.coordinates[0]?.toFixed(6)}
                                </p>
                              )}
                          </div>
                      </div>
                      <Link href="/admin/incidents" className="p-2 rounded-xl bg-white/5 text-text-secondary group-hover:bg-accent-orange group-hover:text-white transition-all active:scale-95">
                        <ArrowRight size={16} />
                      </Link>
                  </div>
              ))}
              {recentIncidents.length === 0 && !loading && (
                 <div className="p-12 text-center text-neutral-600 text-[10px] font-black uppercase tracking-[0.3em] italic font-mono">No recent system reports.</div>
              )}
          </div>
      </Card>

      {/* ── EMERGENCY CONTACT MODAL ── */}
      {selectedSOSUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl" 
            onClick={() => setSelectedSOSUser(null)} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-neutral-900 border border-red-500/20 rounded-[2.5rem] p-10 max-w-lg w-full shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-accent-magenta to-red-500" />
            
            <div className="flex items-start justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">
                  Rescue <span className="text-red-500">Record</span>
                </h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Crisis Intel Level 4</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-2xl">
                <Shield size={28} />
              </div>
            </div>

            <div className="space-y-6">
              {/* Primary User Info */}
              <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] shadow-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500/60 mb-4 italic">Direct Communication Data</p>
                <h4 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">{selectedSOSUser?.name}</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm font-bold text-neutral-400 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                    <Mail size={18} className="text-red-500" /> {selectedSOSUser?.email}
                  </div>
                  <div className="flex items-center gap-4 text-lg font-black text-white p-4 bg-white/[0.04] rounded-2xl border border-red-500/10">
                    <Phone size={20} className="text-red-500" /> {selectedSOSUser?.phone || 'No direct phone logged'}
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setSelectedSOSUser(null)}
              className="mt-10 w-full py-5 bg-white/5 hover:bg-white/10 text-[11px] font-black uppercase tracking-[0.3em] text-white rounded-2xl transition-all border border-white/5 hover:border-red-500/50"
            >
              Close Rescue Record
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
