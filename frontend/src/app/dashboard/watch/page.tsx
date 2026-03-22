'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Users, MapPin, Shield, Clock, 
  MessageSquare, AlertTriangle, Loader2, 
  Globe, Radio, Zap, ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { useLocation } from '@/hooks/useLocation';
import toast from 'react-hot-toast';

// ── MEMOIZED MESSAGE ITEM ──
const MessageItem = React.memo(({ msg, userId }: { msg: any, userId: string }) => {
  const isMe = msg.user._id === userId;
  return (
    <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={`flex ${isMe ? 'justify-end' : 'justify-start'} group will-change-transform`}
    >
        <div className={`max-w-[75%] md:max-w-[65%] space-y-1.5`}>
            <div className={`flex items-center gap-3 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500 group-hover:text-white transition-colors">
                    {msg.user.name}
                </span>
                <span className="text-[8px] font-bold text-neutral-600">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
            <div className={`
                px-7 py-4 rounded-[1.8rem] text-sm leading-relaxed relative overflow-hidden transition-all duration-300
                ${isMe 
                    ? 'bg-accent-magenta text-white rounded-tr-none shadow-[0_10px_25px_rgba(185,5,94,0.25)]' 
                    : 'bg-neutral-900/60 backdrop-blur-md text-white/90 rounded-tl-none border border-white/5 hover:border-white/10'
                }
            `}>
                {msg.content}
            </div>
        </div>
    </motion.div>
  );
});

export default function NeighborhoodWatchPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // High-Performance Scroller
  const scrollToBottom = useCallback((instant = false) => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
            behavior: instant ? 'auto' : 'smooth', 
            block: 'end' 
        });
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!location) return;
    try {
      const res = await api.get(`/chat/nearby?lng=${location[0]}&lat=${location[1]}`);
      setMessages(res.data.data || []);
    } catch (error) {
      console.warn('Failed to load local chat');
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    if (!location || !socket) return;
    
    fetchMessages();
    socket.emit('join-neighborhood', { lat: location[1], lng: location[0] });

    const handleMsg = (msg: any) => {
      setMessages(prev => [...prev, msg]);
      // Use instant scroll for new messages to keep pace with high-frequency activity
      setTimeout(() => scrollToBottom(false), 50);
    };

    const handleCount = (count: number) => {
      setOnlineCount(count);
    };

    socket.on('neighborhood-message-received', handleMsg);
    socket.on('neighborhood-count-update', handleCount);
    
    return () => {
      socket.off('neighborhood-message-received', handleMsg);
      socket.off('neighborhood-count-update', handleCount);
    };
  }, [location?.[0], location?.[1], socket, fetchMessages, scrollToBottom]);

  // Initial load scroll
  useEffect(() => {
    if (!loading && messages.length > 0) {
        scrollToBottom(true);
    }
  }, [loading, messages.length, scrollToBottom]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !location || !user) return;

    socket.emit('send-neighborhood-message', {
      userId: user.id,
      content: newMessage,
      lat: location[1],
      lng: location[0]
    });

    setNewMessage('');
  };

  const messageList = useMemo(() => (
    messages.map((msg) => (
      <MessageItem key={msg._id} msg={msg} userId={user?.id || ''} />
    ))
  ), [messages, user?.id]);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-8 pb-10 px-4 sm:px-0">
      {/* ── INFO PANEL ── */}
      <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="p-8 space-y-8 bg-white/[0.02] border-white/5 relative overflow-hidden group rounded-[2.5rem] shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-magenta/5 blur-[80px] pointer-events-none" />
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-2xl group-hover:border-accent-magenta transition-colors duration-500">
                            <MessageSquare className="w-7 h-7 text-accent-magenta" />
                        </div>
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-accent-magenta opacity-60">HUB_LIVE</span>
                            <h1 className="text-2xl font-black tracking-tight leading-none uppercase">Watch <br/><span className="italic text-accent-magenta">Chat</span></h1>
                        </div>
                    </div>
                    <p className="text-[10px] text-neutral-500 font-bold leading-relaxed tracking-widest uppercase italic opacity-80">
                      Synchronized proximity network verified for <span className="text-white">5.00km</span>.
                    </p>
                </div>

                <div className="space-y-4 pt-8 border-t border-white/5 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                        <MapPin size={16} className="text-accent-magenta animate-pulse" />
                        <span className="truncate">{location ? `${location[1].toFixed(4)}, ${location[0].toFixed(4)}` : 'SCANNING GPS...'}</span>
                    </div>
                </div>
            </Card>
        </motion.div>

        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="p-8 bg-accent-orange/5 border border-accent-orange/20 rounded-[2.5rem] relative overflow-hidden"
        >
            <div className="flex items-center gap-3 mb-4">
               <ShieldCheck className="text-accent-orange" size={18} />
               <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-orange italic">Safety Prime</h4>
            </div>
            <p className="text-[9px] font-bold text-neutral-400 uppercase leading-loose tracking-widest">
              Live coordinator active. Report anomalies immediately. Stay within verified zones.
            </p>
        </motion.div>
      </div>

      {/* ── CHAT ENGINE ── */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col min-w-0">
        <Card className="flex-1 p-0 overflow-hidden flex flex-col bg-neutral-950/20 backdrop-blur-3xl border-white/5 shadow-2xl rounded-[3rem]">
            {/* HUB HEADER */}
            <div className="px-8 py-7 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 shadow-[0_0_10px_#22c55e]" />
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-green-500">Live_Node</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white/5 px-6 py-2.5 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest italic flex items-center gap-2">
                        <Users size={12} className="text-accent-magenta" />
                        {onlineCount} <span className="text-neutral-500 italic">PEERS_ONLINE</span>
                    </span>
                </div>
            </div>

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-7 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
                {!location ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-6">
                        <Loader2 size={32} className="text-accent-magenta animate-spin opacity-50" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-600">Acquiring Tactical Position...</p>
                    </div>
                ) : messages.length === 0 && !loading ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                        <Radio size={80} className="mb-6 animate-pulse" />
                        <p className="text-[10px] font-black uppercase tracking-[0.5em]">Radio Silence in this sector.</p>
                    </div>
                ) : (
                    <div className="space-y-8 pb-4">
                        {messageList}
                    </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* INPUT UNIT */}
            <div className="p-8 bg-black/60 border-t border-white/5 backdrop-blur-xl">
                <form onSubmit={handleSend} className="relative group/input">
                    <div className="absolute -inset-1 bg-gradient-to-r from-accent-magenta/30 via-accent-orange/30 to-accent-magenta/30 rounded-[2.5rem] blur-xl opacity-0 group-focus-within/input:opacity-100 transition duration-1000 animate-pulse" />
                    
                    <div className="relative flex items-center bg-neutral-900/40 border border-white/10 rounded-[2.5rem] p-2 pr-4 pl-8 group-focus-within/input:bg-black/80 transition-all duration-500">
                        <input 
                            type="text" 
                            placeholder="COMMUNICATE WITH LOCAL HUB..." 
                            className="flex-1 bg-transparent py-5 text-[11px] font-black uppercase tracking-widest text-white outline-none placeholder:text-neutral-700 font-mono"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={!location}
                        />
                        <button 
                            type="submit"
                            disabled={!location || !newMessage.trim()}
                            className="w-14 h-14 rounded-[1.5rem] bg-accent-magenta text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-10 shadow-2xl hover:shadow-[0_0_30px_rgba(185,5,94,0.4)]"
                        >
                            <Zap size={22} fill="currentColor" />
                        </button>
                    </div>
                </form>
            </div>
        </Card>
      </motion.div>
    </div>
  );
}
