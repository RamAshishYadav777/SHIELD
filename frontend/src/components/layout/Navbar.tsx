'use client';

import React, { memo, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useUI } from '@/hooks/useUI';
import dynamic from 'next/dynamic';

const NavbarActions = dynamic(() => import('./NavbarActions').then(m => m.NavbarActions), { 
  ssr: false,
  loading: () => <div className="h-10 w-[200px]" />
});

export const Navbar = memo(() => {
  const { user, loading } = useAuth();
  const { setSidebarOpen } = useUI();
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDashboard = useMemo(() => pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin'), [pathname]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-[9999] h-16 md:h-20 bg-black/95 backdrop-blur-xl border-b border-white/5 px-4 md:px-12 flex items-center justify-between">
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
      <div className="flex items-center gap-3 min-w-[200px] justify-end">
        <NavbarActions />
      </div>
    </nav>
  );
});

Navbar.displayName = 'Navbar';




