'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { setConnected, setSocketId } from '@/store/slices/socketSlice';
import { useAuth } from './useAuth';
import api from '@/lib/api';
import toast from 'react-hot-toast';

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

  // incrementing this forces the useEffect to re-run and create a fresh connection
  const [reconnectTrigger, setReconnectTrigger] = useState(0);



  // play siren sound when an emergency happens
  const playSiren = useCallback(async () => {
    const ctx = initAudio();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (e) { }
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

    for (let i = 0; i < 4; i++) {
      playTone(950, i * 0.4, 0.2);
      playTone(750, i * 0.4 + 0.2, 0.2);
    }
  }, []);

  useEffect(() => {
    // if no user, kill the socket
    if (!user) {
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
        setSocket(null);
        dispatch(setConnected(false));
        dispatch(setSocketId(null));
      }
      return;
    }

    // if we already have a live connection, skip
    if (globalSocket?.connected) {
      return;
    }

    // disconnect any dead socket before making a new one
    if (globalSocket && !globalSocket.connected) {
      globalSocket.disconnect();
      globalSocket = null;
      setSocket(null);
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ||
      (process.env.NEXT_PUBLIC_API_URL
        ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api$/, '')
        : 'http://localhost:5000');

    // cookies are sent automatically by the browser (withCredentials)
    // the server reads the accessToken cookie from the handshake headers
    const newSocket = io(socketUrl, {
      withCredentials: true,
      reconnectionAttempts: 3,    // don't retry forever — let token refresh handle it
      reconnectionDelay: 2000,
      autoConnect: true
    });

    globalSocket = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      dispatch(setConnected(true));
      dispatch(setSocketId(newSocket.id || null));
      newSocket.emit('join', user.id);
    });

    newSocket.on('connect_error', (err) => {
      if (err.message.includes('auth failed')) {
        // Just log a warning since this is an expected token rotation event
        console.warn('socket warning: token rotating or expired, initiating refresh sequence...');
        
        // token expired — clean up socket and trigger token refresh
        newSocket.disconnect();
        globalSocket = null;
        setSocket(null);
        dispatch(setConnected(false));
        dispatch(setSocketId(null));

        // refresh token instantly
        api.get('/auth/refresh').then(() => {
           console.log('socket token successfully refreshed');
           setReconnectTrigger(prev => prev + 1);
        }).catch(() => {
           // trigger logout if it totally fails
           if (typeof window !== 'undefined') {
             window.dispatchEvent(new CustomEvent('shield-auth-expired'));
           }
        });
      } else {
        // only throw red errors for actual unexpected breaks
        console.error('socket connection error:', err.message);
      }
    });

    newSocket.on('disconnect', (reason) => {
      dispatch(setConnected(false));
      dispatch(setSocketId(null));

      // if server kicked us, try to refresh auth
      if (reason === 'io server disconnect') {
        globalSocket = null;
        setSocket(null);
      }
    });

    // listen for emergency SOS alerts
    newSocket.on('system-alert', (data: any) => {
      if (data && data.type === 'SOS') {
        const name = data.userName || data.user || 'Someone';
        playSiren().catch(e => console.warn('siren failed:', e));

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
    });

    return () => {
      // only clean up if user logged out, not on reconnect
    };
  }, [user, dispatch, playSiren, reconnectTrigger]); // reconnectTrigger forces fresh connection after token refresh

  return { socket, isConnected, socketId, playSiren };
};
