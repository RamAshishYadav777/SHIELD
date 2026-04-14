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

  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // redirect if guest
  React.useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/');
    }
  }, [user, loading, router, mounted]);

  // sidebar links
  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Overview', href: '/dashboard' },
    { icon: <div className="w-5 h-5 relative"><Image src="/shield_v10.png" alt="Logo" width={20} height={20} className="object-contain" /></div>, label: 'Local Chat', href: '/dashboard/watch' },
    { icon: <MapPin size={20} />, label: 'Safe Zones', href: '/dashboard/map' },
    { icon: <AlertTriangle size={20} />, label: 'History', href: '/dashboard/history' },
    { icon: <FileText size={20} />, label: 'Safety Reports', href: '/dashboard/incidents' },
    { icon: <Users size={20} />, label: 'Contacts', href: '/dashboard/contacts' },
  ];

  // hide while redirecting
  if (mounted && !loading && !user) return null;

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[9990]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 w-64 pt-16 md:pt-20 lg:pt-0 lg:mt-28 lg:mb-4 lg:ml-4 lg:rounded-[2.5rem] glass border-y-0 border-l-0 z-[9991] transition-transform duration-300 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
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

      {/* main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* mobile responsive padding */}
        <main className="flex-1 overflow-y-auto px-4 pb-4 pt-28 md:px-8 md:pb-8 md:pt-40 relative">
           <FlashAlerts />
           <SafeZoneDetector />
           <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent-magenta/5 rounded-full blur-[100px] -z-10"></div>
           
           {/* show loader until ready */}
           {!mounted || (loading && !user) ? (
             <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <div className="text-white/10 uppercase font-black text-[9px] tracking-[0.4em] animate-pulse">Initializing Interface</div>
                </div>
             </div>
           ) : (
             children
           )}
        </main>
      </div>
    </div>
  );
}



