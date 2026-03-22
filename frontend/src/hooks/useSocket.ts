'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { setConnected, setSocketId } from '@/store/slices/socketSlice';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

// Singleton socket instance
let globalSocket: Socket | null = null;

export const useSocket = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { isConnected, socketId } = useSelector((state: RootState) => state.socket);
  const [socket, setSocket] = useState<Socket | null>(globalSocket);

  // Siren utility (restored from context)
  const playSiren = useCallback(() => {
    try {
      // @ts-ignore
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.type = 'square';
        osc.frequency.value = freq;
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + startTime + 0.05);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime + startTime + duration - 0.05);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + startTime + duration);
        
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
      };

      for (let i = 0; i < 4; i++) {
         playTone(900, i * 0.5, 0.25);
         playTone(700, i * 0.5 + 0.25, 0.25);
      }
    } catch (e) {
      console.warn('Audio blocked or unavailable', e);
    }
  }, []);

  useEffect(() => {
    if (user && !globalSocket) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api$/, '') : 'http://localhost:5000');
      const newSocket = io(socketUrl);
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

      newSocket.on('system-alert', (data: any) => {
        playSiren();
        toast(`EMERGENCY: ${data.userName} NEEDS HELP!`, {
          duration: 10000,
          position: 'top-center',
          style: {
            background: 'linear-gradient(90deg, #ff0000, #c7004c)',
            color: '#fff',
            fontWeight: '900',
            borderRadius: '50px',
            padding: '10px 24px',
            border: '1px solid rgba(255,255,255,0.4)',
            boxShadow: '0 0 25px rgba(255,0,0,0.4)',
            fontSize: '12px',
            letterSpacing: '0.1em',
            whiteSpace: 'nowrap'
          },
          icon: '🚨'
        });
      });
    }

    if (!user && globalSocket) {
      globalSocket.disconnect();
      globalSocket = null;
      setSocket(null);
      dispatch(setConnected(false));
      dispatch(setSocketId(null));
    }

    return () => {
      // Don't disconnect here because multiple hooks share the global instance
    };
  }, [user, dispatch, playSiren]);

  return { socket, isConnected, socketId };
};
