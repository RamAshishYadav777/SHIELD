'use client';

import { usePathname } from 'next/navigation';
import { Footer } from "@/components/layout/Footer";

export default function ConditionalFooter() {
  const pathname = usePathname();
  // Don't show global footer on dashboard/admin pages as they have their own internal scroller
  const isDashboardArea = pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin');
  
  if (isDashboardArea) return null;
  
  return <Footer />;
}
