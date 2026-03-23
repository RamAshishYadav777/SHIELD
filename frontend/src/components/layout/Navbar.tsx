'use client';

import React, { memo, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useUI } from '@/hooks/useUI';

export const Navbar = memo(() => {
  const { user, loading } = useAuth();
  const { setSidebarOpen } = useUI();
  const pathname = usePathname();
  const isDashboard = useMemo(() => pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin'), [pathname]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] h-16 md:h-20 bg-black/95 backdrop-blur-xl border-b border-white/5 px-4 md:px-12 flex items-center justify-between">
      {/* ── LEFT: BOLD LOGO ── */}
      <div className="flex items-center gap-6">
        {isDashboard && (
          <button 
            className="lg:hidden text-white p-2 hover:bg-white/5 rounded-full transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>
        )}
        <Link href="/" className="flex items-center gap-4 group">
          <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-primary/5 blur-xl group-hover:bg-primary/10 transition-colors duration-500" />
            
            <motion.div
              whileHover={{ scale: 1.05, y: -1 }}
              className="relative w-full h-full flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-md overflow-hidden group-hover:border-white/20 transition-all duration-300"
            >
              <svg viewBox="0 0 54 56" className="w-8 h-8 relative z-10 drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
                <path 
                  d="M27 2L4 11.5V27C4 39.8 14 50.6 27 54C40 50.6 50 39.8 50 27V11.5L27 2Z" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="2.5" 
                  className="opacity-90" 
                />
                <text x="27" y="37" textAnchor="middle" fontSize="28" fontWeight="1000" fill="white" className="select-none tracking-tighter">S</text>
              </svg>
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            </motion.div>
          </div>

          <div className="flex flex-col leading-none">
            <h1 className="text-2xl font-black uppercase tracking-[0.12em] bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent group-hover:to-primary transition-all duration-500">
              SHIELD
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
               <div className="w-4 h-[1px] bg-primary/40 group-hover:w-6 transition-all duration-500" />
               <span className="text-[7px] font-black uppercase tracking-[0.5em] text-white/30">SAFETY SYSTEM</span>
            </div>
          </div>
        </Link>
      </div>

      {/* ── RIGHT: ACTIONS ── */}
      <div className="flex items-center gap-3">
        {loading ? (
          <div className="flex items-center gap-3 w-40 h-10 bg-white/5 rounded-full animate-pulse border border-white/5" />
        ) : user ? (
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
        ) : (
          <div className="flex items-center gap-3 animate-in fade-in duration-500">
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
        )}
      </div>
    </nav>
  );
});

Navbar.displayName = 'Navbar';




