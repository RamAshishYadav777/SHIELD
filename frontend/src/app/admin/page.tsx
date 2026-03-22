'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, AlertTriangle, Activity,
  Zap, ArrowRight,
  Shield
} from 'lucide-react';
import { Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0, totalIncidents: 0, verifiedIncidents: 0, 
    totalSOS: 0, totalSafeZones: 0, totalRevenue: 0
  });
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [incRes, sosRes, zoneRes, userRes, payRes] = await Promise.all([
        api.get('/incidents').catch(() => ({ data: { data: [] } })),
        api.get('/sos/history').catch(() => ({ data: { data: [] } })),
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
    } catch (e) {
      console.error('Admin dashboard fetch failed');
    } finally {
      setLoading(false);
    }
  };

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
            <span className="text-sm font-semibold text-white/80">Last Sync: {new Date().toLocaleTimeString()}</span>
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

      {/* Recent Incidents */}
      <Card className="p-0 border-white/10 overflow-hidden rounded-[2.5rem] bg-neutral-900/40 backdrop-blur-xl shadow-2xl">
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-lg font-bold flex items-center gap-2">
                 <Shield className="text-accent-orange" size={20} /> Security Incident Pulse
              </h2>
              <Link href="/admin/incidents" className="text-sm font-semibold text-accent-orange hover:text-white transition-colors flex items-center gap-1">
                View all reports <ArrowRight size={16} />
              </Link>
          </div>
          <div className="divide-y divide-white/5">
              {recentIncidents.map((inc) => (
                  <div key={inc._id} className="p-6 flex items-center justify-between group hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${inc.isVerified ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                          <div>
                              <p className="font-semibold text-white tracking-wide">{inc.title}</p>
                              <p className="text-sm text-text-secondary mt-1">{inc.category} • {new Date(inc.createdAt).toLocaleString()}</p>
                          </div>
                      </div>
                      <Link href="/admin/incidents" className="p-2 rounded-xl bg-white/5 text-text-secondary group-hover:bg-accent-orange group-hover:text-white transition-all">
                        <ArrowRight size={16} />
                      </Link>
                  </div>
              ))}
              {recentIncidents.length === 0 && !loading && (
                 <div className="p-12 text-center text-text-secondary text-sm">No recent incidents detected.</div>
              )}
          </div>
      </Card>
    </div>
  );
}
