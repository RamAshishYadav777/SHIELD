'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, X, Info, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { calculateDistance } from '@/lib/utils';

interface FlashMessage {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'emergency';
  areaName?: string;
  location?: {
    type: string;
    coordinates: number[];
  };
  createdBy?: string;
}

export default function FlashAlerts() {
  const [messages, setMessages] = useState<FlashMessage[]>([]);
  const { socket } = useSocket();
  const { user } = useAuth();
  const userLocation = useLocation();

  useEffect(() => {
    fetchActiveMessages();

    if (socket) {
      socket.on('new-flash-message', (message: FlashMessage) => {
        // DON'T SHOW FOR THE SENDER (Admin who just sent it)
        if (user && message.createdBy === user.id) return;

        // PERSISTENCE CHECK: Skip if already dismissed
        const dismissed = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
        if (dismissed.includes(message._id)) return;

        // LOCATION FILTERING: If message has location, only show if nearby (~50km)
        if (message.location && userLocation) {
          const dist = calculateDistance(
            userLocation[1], userLocation[0],
            message.location.coordinates[1], message.location.coordinates[0]
          );
          if (dist > 50) return; // Skip if too far
        }

        // PLAY SIGNAL: Subtle System Alert
        try {
          const audio = new Audio('https://www.myinstants.com/media/sounds/eas-bleep.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => { /* skip if browser blocks auto-play */ });
        } catch (e) {
          console.warn('Audio feedback failed');
        }

        setMessages((prev) => {
          if (prev.find(m => m._id === message._id)) return prev;
          return [message, ...prev];
        });
      });
    }

    return () => {
      if (socket) socket.off('new-flash-message');
    };
  }, [socket, user, userLocation]);

  const fetchActiveMessages = async () => {
    try {
      const res = await api.get('/flash/active');
      const active = res.data.data;
      
      // Filter out persistent dismissed alerts
      const dismissed = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
      const filtered = active.filter((m: any) => !dismissed.includes(m._id));
      
      setMessages(filtered);
    } catch (error) {
      console.error('Error fetching flash messages:', error);
    }
  };

  const removeMessage = (id: string) => {
    setMessages(prev => prev.filter(m => m._id !== id));
    
    // SAVE TO PERSISTENT STORAGE
    const current = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
    if (!current.includes(id)) {
      localStorage.setItem('dismissedAlerts', JSON.stringify([...current, id]));
    }
  };

  if (messages.length === 0) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] w-full max-w-2xl flex flex-col gap-4 px-6 pointer-events-none">
      {messages.map((m) => (
        <div 
          key={m._id}
          className={`
            pointer-events-auto glass flex items-center justify-between p-4 rounded-2xl border-l-4 shadow-2xl animate-in slide-in-from-top duration-500
            ${m.type === 'emergency' ? 'border-red-500 bg-red-500/10' : ''}
            ${m.type === 'warning' ? 'border-accent-orange bg-orange-500/10' : ''}
            ${m.type === 'info' ? 'border-blue-500 bg-blue-500/10' : ''}
          `}
        >
          <div className="flex items-center gap-4">
            <div className={`
              p-2 rounded-xl
              ${m.type === 'emergency' ? 'bg-red-500/20 text-red-500' : ''}
              ${m.type === 'warning' ? 'bg-orange-500/20 text-accent-orange' : ''}
              ${m.type === 'info' ? 'bg-blue-500/20 text-blue-500' : ''}
            `}>
              {m.type === 'emergency' && <AlertCircle size={24} />}
              {m.type === 'warning' && <AlertTriangle size={24} />}
              {m.type === 'info' && <Info size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-sm tracking-wide uppercase">{m.title}</h4>
                {m.areaName && (
                  <span className="text-[10px] bg-white/10 text-white/40 px-2 py-0.5 rounded border border-white/5 font-black uppercase italic tracking-widest">
                    @{m.areaName}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-1">{m.message}</p>
            </div>
          </div>
          <button 
            onClick={() => removeMessage(m._id)}
            className="p-2 text-text-secondary hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}
