'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Send, MapPin, Shield, Clock, 
  MessageSquare, AlertTriangle, Loader2, 
  Globe, Radio, Zap, ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Card, Button } from '@/components/ui';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { useLocation } from '@/hooks/useLocation';
import toast from 'react-hot-toast';

interface Message {
  _id: string;
  user: { name: string; _id: string };
  content: string;
  createdAt: string;
}

export default function NeighborhoodWatchPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location) {
      fetchMessages();
      if (socket) {
        socket.emit('join-neighborhood', { lat: location[1], lng: location[0] });
        
        const handleMsg = (msg: Message) => {
          setMessages(prev => [...prev, msg]);
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
      }
    }
  }, [location, socket]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    if (!location) return;
    try {
      const res = await api.get(`/chat/nearby?lng=${location[0]}&lat=${location[1]}`);
      setMessages(res.data.data);
    } catch (error) {
      toast.error('Failed to load local chat');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-8 pb-10">
      {/* ── INFO PANEL ── */}
      <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="p-8 space-y-8 bg-white/[0.02] border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-magenta/5 blur-[80px] pointer-events-none" />
                
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-2xl group-hover:border-accent-magenta transition-colors duration-500">
                            <MessageSquare className="w-7 h-7 text-accent-magenta" />
                        </div>
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-accent-magenta opacity-60">Nearby</span>
                            <h1 className="text-3xl font-black tracking-tight leading-none uppercase">Local <br/><span className="italic text-accent-magenta">Chat</span></h1>
                        </div>
                    </div>
                    
                    <p className="text-xs text-neutral-500 font-bold leading-relaxed tracking-tight">
                        Talk to your neighbors and stay safe together. You can chat with anyone within <span className="text-white">5km</span> of your area.
                    </p>
                </div>

                <div className="space-y-4 pt-8 border-t border-white/5">
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        <MapPin size={16} className="text-accent-magenta animate-pulse" />
                        <span>Area: {location ? `${location[1].toFixed(2)}°, ${location[0].toFixed(2)}°` : 'Checking...'}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        <ShieldCheck size={16} className="text-green-500" />
                        <span>Safe Network Active</span>
                    </div>
                </div>
            </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-8 bg-accent-magenta/5 border-accent-magenta/20 overflow-hidden relative">
                <div className="absolute -bottom-10 -right-10 opacity-10">
                    <ShieldAlert size={120} className="text-accent-magenta" />
                </div>
                <div className="flex items-center gap-3 mb-6">
                   <AlertTriangle className="text-accent-magenta" size={20} />
                   <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-magenta">Safety Rules</h4>
                </div>
                <ul className="space-y-4 relative z-10">
                   {[
                       "Report any bad activity",
                       "Ask a neighbor to walk with you",
                       "Be helpful and stay safe"
                   ].map((item, i) => (
                       <li key={i} className="flex items-start gap-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-accent-magenta mt-1.5 shrink-0" />
                           <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 leading-normal">{item}</p>
                       </li>
                   ))}
                </ul>
            </Card>
        </motion.div>
      </div>

      {/* ── CHAT ENGINE ── */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="flex-1 flex flex-col min-w-0"
      >
        <Card className="flex-1 p-0 overflow-hidden flex flex-col bg-neutral-950/50 backdrop-blur-3xl border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
            {/* HUB HEADER */}
            <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shadow-[0_0_10px_#22c55e]" />
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-green-500">Live</span>
                    </div>
                    <div className="h-6 w-[1px] bg-white/10 hidden md:block" />
                    <div className="hidden md:flex items-center gap-2">
                        <Radio size={14} className="text-neutral-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Chatting: <span className="text-white">Active</span></span>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-black/40 px-5 py-2 rounded-2xl border border-white/5">
                    <div className="flex -space-x-2">
                        {[1,2,3].map(i => (
                            <div key={i} className="w-5 h-5 rounded-full border border-black bg-neutral-800" />
                        ))}
                    </div>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest truncate max-w-[80px] md:max-w-none">
                        {onlineCount} People nearby
                    </span>
                </div>
            </div>

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-10 space-y-8 scroll-smooth custom-scrollbar">
                {!location ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-6 text-center">
                        <div className="w-20 h-20 relative">
                            <div className="absolute inset-0 bg-accent-magenta/20 rounded-2xl blur-2xl animate-pulse" />
                            <div className="relative w-full h-full bg-black border border-white/10 rounded-2xl flex items-center justify-center">
                                <Loader2 size={32} className="text-accent-magenta animate-spin" />
                            </div>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500">Finding your location...</p>
                    </div>
                ) : loading ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                         <p className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Connecting you...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
                        <div className="w-32 h-32 relative">
                             <div className="absolute inset-0 bg-accent-magenta/10 rounded-full blur-[60px] animate-pulse" />
                             <Globe size={80} className="relative z-10 text-white/5 opacity-50" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight uppercase mb-3 italic">No messages yet</h3>
                            <p className="text-[10px] uppercase font-black tracking-[0.3em] text-neutral-600 max-w-sm leading-relaxed">
                                Nobody is talking here yet. <br/>Be the first to say hi!
                            </p>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {messages.map((msg, i) => {
                            const isMe = msg.user._id === user?.id;
                            return (
                                <motion.div 
                                    key={msg._id} 
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
                                >
                                    <div className={`max-w-[75%] md:max-w-[65%] space-y-2`}>
                                        <div className={`flex items-center gap-3 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500 group-hover:text-white transition-colors">
                                                {msg.user.name}
                                            </span>
                                            <span className="text-[8px] font-bold text-neutral-600">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className={`
                                            px-8 py-5 rounded-[2rem] text-sm leading-relaxed relative overflow-hidden transition-all duration-300
                                            ${isMe 
                                                ? 'bg-accent-magenta text-white rounded-tr-none shadow-[0_15px_30px_rgba(185,5,94,0.3)]' 
                                                : 'bg-neutral-900/60 backdrop-blur-md text-white/90 rounded-tl-none border border-white/5 hover:border-white/10'
                                            }
                                        `}>
                                            {msg.content}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
                <div ref={scrollRef} />
            </div>

            {/* INPUT UNIT */}
            <div className="p-8 bg-black/40 border-t border-white/5 backdrop-blur-xl">
                <form onSubmit={handleSend} className="relative group/input">
                    <div className="absolute -inset-1 bg-gradient-to-r from-accent-magenta/30 to-purple-600/30 rounded-[2.5rem] blur-xl opacity-0 group-focus-within/input:opacity-100 transition duration-700" />
                    
                    <div className="relative flex items-center bg-neutral-900/60 border border-white/10 rounded-[2.5rem] p-2 pr-4 pl-8 group-focus-within/input:border-accent-magenta/50 transition-all duration-500">
                        <input 
                            type="text" 
                            placeholder="TYPE A MESSAGE FOR PEOPLE NEARBY..." 
                            className="flex-1 bg-transparent py-4 text-xs font-black uppercase tracking-widest text-white outline-none placeholder:text-neutral-700"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={!location}
                        />
                        <button 
                            type="submit"
                            disabled={!location || !newMessage.trim()}
                            className="w-14 h-14 rounded-2xl bg-accent-magenta text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-20 disabled:grayscale shadow-2xl hover:shadow-accent-magenta/30"
                        >
                            <Zap size={24} />
                        </button>
                    </div>
                </form>
            </div>
        </Card>
      </motion.div>
    </div>
  );
}
