'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, X, Info, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';

interface FlashMessage {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'emergency';
}

export default function FlashAlerts() {
  const [messages, setMessages] = useState<FlashMessage[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    fetchActiveMessages();

    if (socket) {
      socket.on('new-flash-message', (message: FlashMessage) => {
        setMessages(prev => [message, ...prev]);
      });
    }

    return () => {
      if (socket) socket.off('new-flash-message');
    };
  }, [socket]);

  const fetchActiveMessages = async () => {
    try {
      const res = await api.get('/flash/active');
      setMessages(res.data.data);
    } catch (error) {
      console.error('Error fetching flash messages:', error);
    }
  };

  const removeMessage = (id: string) => {
    setMessages(prev => prev.filter(m => m._id !== id));
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
              <h4 className="font-bold text-sm tracking-wide uppercase">{m.title}</h4>
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
