"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.05] py-16 bg-bg-dark relative z-10 font-sans">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-white">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full group-hover:bg-primary/40 transition-all" />
              <Image src="/shield_v10.png" alt="SHIELD Logo" width={28} height={28} className="relative z-10" />
            </div>
            <span className="text-base font-black uppercase tracking-[0.25em] group-hover:text-primary transition-colors">SHIELD</span>
          </Link>

          <div className="flex flex-wrap justify-center items-center gap-8">
            {["Safety", "Private", "Rules", "Help"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
              >
                {link}
              </a>
            ))}
            <Link
              href="/login?role=admin"
              className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white border border-primary/30 hover:border-white/30 px-3 py-1.5 rounded-full transition-all"
            >
              Admin Login
            </Link>
          </div>

          <div className="flex items-center gap-3 text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">
            <div className="flex items-center gap-2 px-2 py-1 rounded-sm bg-primary/5 border border-primary/10">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-primary">LIVE</span>
            </div>
            <span>© 2026 SHIELD. Running perfectly.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

