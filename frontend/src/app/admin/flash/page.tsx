'use client';

import React, { useState } from 'react';
import { 
  Send, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  Clock,
  Zap,
  Radio,
  Bell,
  Activity
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminFlashPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    durationInHours: 24
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/flash', formData);
      toast.success('Alert sent successfully!');
      setFormData({ title: '', message: '', type: 'info', durationInHours: 24 });
    } catch (error) {
      toast.error('Failed to send alert');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (type: string) => {
    switch(type) {
      case 'emergency': return 'from-red-600 to-red-400';
      case 'warning': return 'from-accent-orange to-orange-400';
      default: return 'from-blue-600 to-blue-400';
    }
  };

  const getAuraColor = (type: string) => {
    switch(type) {
      case 'emergency': return 'bg-red-500/10';
      case 'warning': return 'bg-accent-orange/10';
      default: return 'bg-blue-500/10';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center">
                    <Radio className="text-accent-orange" size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-orange opacity-70">Broadcasting</span>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight italic">Send Safety <span className="text-white/40 not-italic">Alerts</span></h1>
            <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest pl-1">Send important messages to everyone using SHIELD.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">System Live</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Global Reach</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── MAIN FORM ── */}
        <div className="lg:col-span-2">
          <Card className="p-10 bg-neutral-900/40 backdrop-blur-3xl border-white/10 relative overflow-hidden rounded-[3rem] shadow-2xl">
            {/* Dynamic Status Aura */}
            <motion.div 
               animate={{ opacity: [0.1, 0.2, 0.1] }}
               transition={{ duration: 3, repeat: Infinity }}
               className={`absolute top-0 right-0 w-64 h-64 blur-[100px] pointer-events-none transition-colors duration-700 ${getAuraColor(formData.type)}`} 
            />

            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              <div className="space-y-8">
                {/* Title Input */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-4">Alert Title</label>
                    <input 
                        placeholder="e.g. Heavy Rain Alert / Maintenance" 
                        className="w-full bg-white/[0.03] border border-white/10 h-16 rounded-2xl px-8 text-sm font-bold outline-none focus:border-accent-orange transition-all placeholder:text-neutral-700"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Urgency Level */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-4">Urgency Level</label>
                        <div className="grid grid-cols-3 gap-2 bg-black/40 p-1.5 rounded-[1.25rem] border border-white/5">
                            {['info', 'warning', 'emergency'].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({...formData, type: type as any})}
                                    className={`
                                        h-11 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                                        ${formData.type === type 
                                            ? 'bg-white text-black shadow-xl ring-4 ring-white/5' 
                                            : 'text-neutral-500 hover:text-white hover:bg-white/5'
                                        }
                                    `}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-4">Duration (Hours)</label>
                        <div className="relative">
                            <input 
                                type="number"
                                value={formData.durationInHours}
                                onChange={(e) => setFormData({...formData, durationInHours: parseInt(e.target.value)})}
                                className="w-full bg-white/[0.03] border border-white/10 h-14 rounded-2xl px-8 text-sm font-bold outline-none focus:border-accent-orange transition-all"
                                required
                            />
                            <Clock size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-600" />
                        </div>
                    </div>
                </div>

                {/* Message Body */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-4">Alert Message</label>
                    <textarea 
                        className="w-full h-40 bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 text-sm font-bold outline-none focus:border-accent-orange resize-none placeholder:text-neutral-700 transition-all leading-relaxed"
                        placeholder="Write your message here..."
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        required
                    />
                </div>
              </div>

              <Button 
                disabled={loading}
                className={`
                    w-full h-20 !rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm text-white transition-all duration-500 relative overflow-hidden group
                    ${loading ? 'opacity-50 grayscale' : 'hover:scale-[1.02] active:scale-95 shadow-2xl'}
                `}
                style={{ 
                    background: formData.type === 'emergency' 
                        ? 'linear-gradient(135deg, #ef4444, #991b1b)' 
                        : (formData.type === 'warning' ? 'linear-gradient(135deg, #F4821F, #B9055E)' : 'linear-gradient(135deg, #2563eb, #1e40af)')
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-4">
                    {loading ? 'Processing...' : (
                        <>SEND ALERT NOW <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></>
                    )}
                </span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </form>
          </Card>
        </div>

        {/* ── SIDE INFO ── */}
        <div className="space-y-6">
            <Card className="p-8 bg-neutral-900/40 backdrop-blur-xl border-white/10 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Info className="text-blue-500" size={18} />
                    </div>
                    <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 opacity-70">Category 01</span>
                        <h4 className="text-sm font-black uppercase">General Info</h4>
                    </div>
                </div>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest leading-relaxed">
                    Use this for maintenance messages, app updates, or non-urgent news.
                </p>
            </Card>

            <Card className="p-8 bg-neutral-900/40 backdrop-blur-xl border-white/10 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent-orange/5 blur-2xl group-hover:bg-accent-orange/10 transition-colors" />
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center">
                        <AlertTriangle className="text-accent-orange" size={18} />
                    </div>
                    <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-accent-orange opacity-70">Category 02</span>
                        <h4 className="text-sm font-black uppercase">Area Warning</h4>
                    </div>
                </div>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest leading-relaxed">
                    Use this for safety warnings, road closures, or suspicious activity alerts.
                </p>
            </Card>

            <Card className="p-8 bg-neutral-900/40 backdrop-blur-xl border-white/10 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-2xl group-hover:bg-red-500/10 transition-colors" />
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <AlertCircle className="text-red-500" size={18} />
                    </div>
                    <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-red-500 opacity-70">Category 03</span>
                        <h4 className="text-sm font-black uppercase">Critical Alarm</h4>
                    </div>
                </div>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest leading-relaxed">
                    Only use for immediate danger, fire, medical emergencies, or severe threats.
                </p>
            </Card>

            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-accent-magenta/20 to-transparent border border-accent-magenta/20">
                <div className="flex items-center gap-3 mb-4">
                    <Activity size={16} className="text-accent-magenta animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent-magenta">Live Stats</span>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-2xl font-black italic">Active</p>
                        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Global Broadcast</p>
                    </div>
                    <div className="text-right">
                        <p className="text-neutral-500 font-black text-xs">READY</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
