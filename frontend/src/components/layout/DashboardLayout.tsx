'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Shield, 
  LayoutDashboard, 
  AlertTriangle, 
  MapPin, 
  FileText, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  Bell
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { useUI } from '@/hooks/useUI';
import { Button } from '@/components/ui';
import FlashAlerts from '@/components/ui/FlashAlerts';
import SafeZoneDetector from '@/components/safety/SafeZoneDetector';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ icon, label, href, active, onClick }: SidebarItemProps) => (
  <Link href={href} onClick={onClick}>
    <div className={`flex items-center gap-4 px-6 py-4 transition-all duration-300 ${
      active 
        ? 'bg-accent-orange/10 text-accent-orange border-r-4 border-accent-orange' 
        : 'text-text-secondary hover:bg-white/5 hover:text-white'
    }`}>
      {icon}
      <span className="font-semibold">{label}</span>
    </div>
  </Link>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useUI();
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white/20 uppercase font-black text-[10px] tracking-[0.5em] animate-pulse">
        Shield Secure Area
      </div>
    );
  }

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Overview', href: '/dashboard' },
    { icon: <div className="w-5 h-5 relative"><Image src="/shield_v10.png" alt="Logo" width={20} height={20} className="object-contain" /></div>, label: 'Local Chat', href: '/dashboard/watch' },
    { icon: <MapPin size={20} />, label: 'Safe Zones', href: '/dashboard/map' },
    { icon: <AlertTriangle size={20} />, label: 'History', href: '/dashboard/history' },
    { icon: <FileText size={20} />, label: 'Safety Reports', href: '/dashboard/incidents' },
    { icon: <Users size={20} />, label: 'Contacts', href: '/dashboard/contacts' },
  ];

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 w-64 lg:mt-28 lg:mb-4 lg:ml-4 lg:rounded-[2.5rem] glass border-y-0 border-l-0 z-50 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar branding removed as requested */}

        <nav className="mt-8 flex-1">
          {menuItems.map((item) => (
            <SidebarItem 
              key={item.href}
              {...item}
              active={pathname === item.href}
              onClick={() => setSidebarOpen(false)}
            />
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 p-4">
          <SidebarItem 
            icon={<Settings size={20} />} 
            label="Settings" 
            href="/dashboard/settings" 
            active={pathname === '/dashboard/settings'}
          />
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 px-6 py-4 text-text-secondary hover:bg-red-500/10 hover:text-red-500 transition-all duration-300"
          >
            <LogOut size={20} />
            <span className="font-semibold">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header removed and integrated into global Navbar */}


        {/* Page Area */}
        <main className="flex-1 overflow-y-auto p-8 pt-40 relative">
           <FlashAlerts />
           <SafeZoneDetector />
           <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent-magenta/5 rounded-full blur-[100px] -z-10"></div>
           {children}
        </main>
      </div>
    </div>
  );
}



