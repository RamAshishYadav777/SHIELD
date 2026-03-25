'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export const NavbarActions = () => {
  const { user: reduxUser } = useAuth();
  const [mounted, setMounted] = React.useState(false);

  // Synchronous check for initial render to prevent blink
  const initialUser = React.useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('shield_user');
      if (stored) {
        try { return JSON.parse(stored); } catch (e) { return null; }
      }
    }
    return null;
  }, []);

  // Derived user state
  const user = mounted ? reduxUser : (reduxUser || initialUser);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until mounted to be 100% safe
  if (!mounted) return <div className="h-10 w-[200px]" />;

  if (user) {
    return (
      <div className="flex items-center gap-5">
        <div className="hidden sm:flex items-center gap-3 mr-2 bg-white/[0.03] border border-white/5 py-1.5 px-2 rounded-full pr-4">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-sm shadow-[0_0_15px_rgba(244,130,31,0.2)]">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col justify-center leading-none">
            <span className="text-[9px] font-black tracking-widest text-primary/60 uppercase">Authenticated</span>
            <span className="text-sm font-bold text-white capitalize mt-1">{user.name}</span>
          </div>
        </div>
        <Link
          href={user.role === 'admin' ? "/admin" : "/dashboard"}
          className="relative px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest text-white overflow-hidden group border border-primary/20"
          style={{ background: "linear-gradient(135deg, #F4821F, #B9055E)" }}
        >
          <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
          <span className="relative flex items-center gap-1.5 leading-none font-black">
            {user.role === 'admin' ? 'Admin Control' : 'Member Area'}
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="relative px-5 py-2.5 text-[12px] font-black uppercase tracking-[0.2em] transition-all hover:text-primary text-white group"
      >
        Sign In
        <span className="absolute bottom-1 left-0 h-0.5 w-0 group-hover:w-full bg-primary transition-all duration-300" />
      </Link>

      <Link
        href="/register"
        className="relative px-8 py-3 rounded-full text-[12px] font-black uppercase tracking-[0.2em] text-black bg-white overflow-hidden group shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:text-white transition-all duration-300"
      >
        <span className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        <span className="relative z-10">Join Now</span>
      </Link>
    </div>
  );
};
