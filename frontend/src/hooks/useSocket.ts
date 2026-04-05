'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { setConnected, setSocketId } from '@/store/slices/socketSlice';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

// ─── HIGH PERFORMANCE SINGLETONS ──────────────────────────────────────────
let audioCtx: AudioContext | null = null;
let globalSocket: Socket | null = null;

const initAudio = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      // @ts-ignore
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    } catch (e) {
      console.warn('Audio Context failed to initialize');
    }
  }
  return audioCtx;
};

export const useSocket = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { isConnected, socketId } = useSelector((state: RootState) => state.socket);
  const [socket, setSocket] = useState<Socket | null>(globalSocket);

  const playSiren = useCallback(async () => {
    const ctx = initAudio();
    if (!ctx) return;
    
    // Resume context if suspended (Browser security requirement)
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (e) {}
    }

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + startTime + 0.05);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime + startTime + duration - 0.05);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + startTime + duration);
      
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    // Tactical 4-cycle siren burst
    for (let i = 0; i < 4; i++) {
       playTone(950, i * 0.4, 0.2);
       playTone(750, i * 0.4 + 0.2, 0.2);
    }
  }, []);

  useEffect(() => {
    // 1. Initial Connection Logic
    if (user && !globalSocket) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
        (process.env.NEXT_PUBLIC_API_URL 
          ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api$/, '') 
          : 'http://localhost:5000');

      const newSocket = io(socketUrl, {
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        transports: ['websocket']
      });

      globalSocket = newSocket;
      setSocket(newSocket);

      newSocket.on('connect', () => {
        dispatch(setConnected(true));
        dispatch(setSocketId(newSocket.id || null));
        newSocket.emit('join', user.id);
      });

      newSocket.on('disconnect', () => {
        dispatch(setConnected(false));
        dispatch(setSocketId(null));
      });
    }

    // 2. Performance Listener Hub
    const activeSocket = globalSocket;
    if (activeSocket && user) {
      const onAlert = (data: any) => {
        // ONLY SHOW EMERGENCY TOAST FOR SOS TYPE
        if (data && data.type === 'SOS') {
          const name = data.userName || data.user || 'Someone';
          playSiren();
          toast(`🚨 EMERGENCY: ${name} NEEDS HELP!`, {
            id: 'sos-alert',
            duration: 12000,
            position: 'top-center',
            style: {
              background: 'linear-gradient(90deg, #b91c1c, #991b1b)',
              color: '#fff',
              fontWeight: '900',
              borderRadius: '1.5rem',
              padding: '12px 24px',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              fontSize: '11px',
              letterSpacing: '0.1em'
            },
            icon: '📢'
          });
        }
      };

      activeSocket.off('system-alert');
      activeSocket.on('system-alert', onAlert);
    }

    // 3. Absolute Cleanup on Exit
    if (!user && globalSocket) {
      globalSocket.disconnect();
      globalSocket = null;
      setSocket(null);
      dispatch(setConnected(false));
      dispatch(setSocketId(null));
      
      if (audioCtx) {
        audioCtx.close().catch(() => {});
        audioCtx = null;
      }
    }

    return () => {
      // Intentionally empty: Singleton persists across component lifecycle
    };
  }, [user, dispatch, playSiren]);

  return { socket, isConnected, socketId, playSiren };
};
