"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  ArrowRight,
  MapPin,
  Bell,
  Users,
  Zap,
  Eye,
  Lock,
  BarChart3,
  Navigation,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import HomeBanner from "@/components/home/HomeBanner";
import api from "@/lib/api";

// ─── PARTICLE CANVAS (Performance Optimized) ──────────────────────────────────
const ParticleCanvas = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const count = 60; // Reduced for performance
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.2 + 0.4,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(244,130,31,${p.alpha})`;
        ctx.fill();
      });

      // Connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(244,130,31,${0.05 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-40" aria-hidden="true" />;
});
ParticleCanvas.displayName = "ParticleCanvas";

// ─── SCANLINE OVERLAY ──────────────────────────────────────────────────────────
const ScanlineOverlay = memo(() => (
  <div
    className="absolute inset-0 z-0 pointer-events-none opacity-[0.02]"
    style={{
      backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.8) 2px, rgba(255,255,255,0.8) 3px)",
      backgroundSize: "100% 3px",
    }}
  />
));
ScanlineOverlay.displayName = "ScanlineOverlay";

// ─── FEATURE CARD ──────────────────────────────────────────────────────────────
const FeatureCard = memo(({ icon: Icon, title, description, delay = 0, colorClass }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    className="group relative p-8 rounded-[2rem] border border-white/[0.05] bg-white/[0.01] hover:bg-neutral-900/40 hover:border-white/10 transition-all duration-500"
  >
    <div className={cn(
      "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-700 blur-[60px] rounded-[2rem]",
      colorClass === "orange" ? "bg-primary" : colorClass === "pink" ? "bg-accent-magenta" : colorClass === "blue" ? "bg-blue-500" : "bg-emerald-500"
    )} />

    <div className="relative z-10">
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500",
        colorClass === "orange" ? "bg-orange-500/10 text-orange-500 border border-orange-500/10" : 
        colorClass === "pink" ? "bg-pink-500/10 text-pink-500 border border-pink-500/10" : 
        colorClass === "blue" ? "bg-blue-500/10 text-blue-500 border border-blue-500/10" : 
        "bg-emerald-500/10 text-emerald-500 border border-emerald-500/10"
      )}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-black text-white mb-3 tracking-tight group-hover:translate-x-1 transition-transform duration-300">
        {title}
      </h3>
      <p className="text-neutral-500 leading-relaxed text-[13px] font-bold tracking-tight">
        {description}
      </p>
    </div>
  </motion.div>
));
FeatureCard.displayName = "FeatureCard";

// ─── MAIN LANDING PAGE ────────────────────────────────────────────────────────
export default function Home() {
  const [liveStats, setLiveStats] = useState({ users: 0, incidents: 0, zones: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/users/public/stats');
      if (res.data.success) {
        setLiveStats(res.data.data);
      }
    } catch (e) {
      // Fail silently for stats on landing page
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const features = useMemo(() => [
    { icon: Lock,        title: "Very Safe",        description: "Your private chats and location are always safe with us.",             colorClass: "orange" },
    { icon: Bell,        title: "Fast Help",        description: "Send a fast alert to your neighbors if you need help instantly.",                colorClass: "pink" },
    { icon: Navigation,  title: "Always Here",      description: "We show you the safest roads near you in real-time.",               colorClass: "blue" },
    { icon: BarChart3,   title: "Report Danger",    description: "Help your neighbors by reporting danger in your area quickly.",             colorClass: "emerald" },
    { icon: MapPin,      title: "Safe Map",         description: "See safe places and help centers near you on our easy map.",            colorClass: "pink" },
    { icon: Users,       title: "Neighbors",        description: "Join your neighbors to keep everyone in the area safe.",                     colorClass: "orange" },
    { icon: ShieldCheck, title: "Admin Area",       description: "Special tools for admins to keep the system running smoothly.",                    colorClass: "blue" },
    { icon: Zap,         title: "Quick News",       description: "Get fast updates about any news or danger near your home.",              colorClass: "emerald" },
  ], []);

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-primary/30 selection:text-white overflow-x-hidden font-sans">
      <ScanlineOverlay />
      <ParticleCanvas />

      <HomeBanner />

      {/* ── KEY FEATURES ── */}
      <section id="features" className="py-16 md:py-40 px-6 relative z-10">
        <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-pink-500/5 rounded-full blur-[150px] pointer-events-none" />

        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-16 md:mb-24">
            <div className="max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary mb-6 border-l-2 border-primary pl-6">How it Works</p>
              <h2 className="text-4xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-4">
                STAY SAFE.<br /><span className="text-primary italic text-2xl md:text-6xl">YOU ARE IN CONTROL.</span>
              </h2>
            </div>
            <div className="max-w-md relative">
              <p className="text-neutral-500 text-base md:text-lg leading-relaxed font-black tracking-tighter">
                SHIELD is the easiest way to stay safe and keep your neighborhood protected with everyone.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 0.05} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION ── */}
      <section className="py-24 md:py-40 px-6 relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent-magenta/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-primary/5 rounded-full blur-[180px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[8px] font-black uppercase tracking-[0.4em] text-primary mb-8">Get Started</span>
            <h2 className="text-4xl md:text-8xl font-black tracking-tighter leading-none mb-10 uppercase">
              BE SAFE <br />
              <span className="text-primary italic">
                NOW.
              </span>
            </h2>
            <p className="text-neutral-500 text-base md:text-lg max-w-xl mx-auto mb-10 md:mb-14 font-black tracking-tighter">
              Join thousands of people who use SHIELD to stay safe every day.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <Link
                href="/register"
                className="group relative flex items-center justify-center gap-3 px-10 md:px-14 py-5 md:py-6 bg-accent-gradient text-white rounded-2xl font-black text-[11px] md:text-sm uppercase tracking-[0.4em] hover:shadow-[0_0_80px_rgba(244,130,31,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Join SHIELD Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}


