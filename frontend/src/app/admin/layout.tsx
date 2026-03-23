'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUI } from '@/hooks/useUI';
import { 
  LayoutDashboard, 
  Zap, 
  Users, 
  ChevronLeft,
  LogOut,
  ShieldCheck,
  Activity,
  Settings,
  CreditCard
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminSidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active: boolean;
}

const AdminSidebarItem = ({ icon, label, href, active }: AdminSidebarItemProps) => (
  <Link href={href}>
    <div className={`flex items-center gap-4 px-6 py-4 transition-all duration-300 ${
      active 
        ? 'bg-accent-orange/10 text-accent-orange border-r-4 border-accent-orange' 
        : 'text-text-secondary hover:bg-white/5 hover:text-white'
    }`}>
      {icon}
      <span className="font-semibold text-sm">{label}</span>
    </div>
  </Link>
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useUI();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (user.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white/20 uppercase font-black text-[10px] tracking-[0.5em] animate-pulse">
        Shield Secure Area
      </div>
    );
  }

  const menuItems = [
    { icon: <Activity size={20} />, label: 'Control Center', href: '/admin' },
    { icon: <ShieldCheck size={20} />, label: 'All Reports', href: '/admin/incidents' },
    { icon: <Zap size={20} />, label: 'Send Alerts', href: '/admin/flash' },
    { icon: <Users size={20} />, label: 'Manage Users', href: '/admin/users' },
    { icon: <CreditCard size={20} />, label: 'Payments', href: '/admin/payments' },
  ];

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden font-sans relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[80px] right-0 w-[50%] h-[50%] bg-accent-orange/[0.03] blur-[150px] rounded-full" />
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[55] mt-[80px]"
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed lg:static inset-y-0 left-0 w-72 lg:mt-28 lg:mb-4 lg:ml-4 lg:rounded-[2.5rem] glass z-[60] transition-transform duration-500 flex flex-col overflow-hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="pt-4 pb-3 px-8 flex flex-col items-center shrink-0 border-b border-white/5 bg-white/[0.01]">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-2 group relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-accent-magenta/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Image src="/shield_v10.png" alt="Admin Logo" width={28} height={28} className="relative z-10" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic">Command Node</p>
        </div>

        <nav className="mt-4 flex-1 space-y-1">
          {menuItems.map((item) => (
            <div key={item.href} onClick={() => setSidebarOpen(false)}>
              <AdminSidebarItem 
                {...item}
                active={pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))}
              />
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 p-4 shrink-0">
          <Link 
            href="/admin/settings"
            onClick={() => setSidebarOpen(false)}
            className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-300 ${
              pathname === '/admin/settings' 
                ? 'bg-accent-orange/10 text-accent-orange border-r-4 border-accent-orange' 
                : 'text-text-secondary hover:bg-white/5 hover:text-white'
            }`}
          >
            <Settings size={20} />
            <span className="font-semibold text-sm">Settings</span>
          </Link>
          
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 px-6 py-4 text-text-secondary hover:bg-red-500/10 hover:text-red-500 transition-all duration-300"
          >
            <LogOut size={20} />
            <span className="font-semibold text-sm">Log Out</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <main className="flex-1 overflow-y-auto p-8 pt-40 h-full relative scroll-smooth selection:bg-accent-magenta/30 custom-scrollbar">
           <AnimatePresence>
             <motion.div
               key={pathname}
               initial={{ opacity: 0, y: 5 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -5 }}
               transition={{ duration: 0.3, ease: 'easeOut' }}
             >
               {children}
             </motion.div>
           </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
