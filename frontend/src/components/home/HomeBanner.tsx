"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Shield, Map, PhoneCall } from "lucide-react";
import Link from "next/link";

// ─── DATA CONFIGURATION (Simplified) ──────────────────────────────────────────
const BANNER_DATA = [
  { id: 1,  title: "STAY SAFE",     subtitle: "SAFE JOURNEY",  description: "Be safe everywhere you go with our easy tracking system.", video: "/homeBanner/hb1.mp4" },
  { id: 2,  title: "WATCHING",      subtitle: "ALWAYS SAFE",   description: "We are always here to help you stay safe throughout the day.", video: "/homeBanner/hb2.mp4" },
  { id: 3,  title: "QUICK HELP",    subtitle: "FAST ALERT",    description: "Get help instantly if anything goes wrong during your trip.", video: "/homeBanner/hb3.mp4" },
  { id: 4,  title: "PRIVATE",       subtitle: "DATA SECURE",   description: "Your private information and location are always safe with us.", video: "/homeBanner/hb4.mp4" },
  { id: 5,  title: "NEIGHBORS",     subtitle: "LOCAL SAFETY",  description: "Keep your neighborhood safe with our easy reporting tool.", video: "/homeBanner/hb5.mp4" },
  { id: 6,  title: "SURVEILLANCE",  subtitle: "SMART EYES",    description: "Advanced monitoring keeps every corner of your city under watch.", video: "/homeBanner/hb6.mp4" },
  { id: 7,  title: "PROTECTION",    subtitle: "INSTANT GUARD", description: "Your personal security circle is just one tap away at any time.", video: "/homeBanner/hb7.mp4" },
  { id: 8,  title: "ANALYTICS",     subtitle: "THREAT SCAN",   description: "We use smart data to find any danger before it ever reaches you.", video: "/homeBanner/hb8.mp4" },
  { id: 9,  title: "COMMUNITY",     subtitle: "SHIELD WATCH",  description: "Thousands of users working together to keep the streets safe.", video: "/homeBanner/hb9.mp4" },
  { id: 10, title: "EMERGENCY",     subtitle: "SOS CONNECT",   description: "Fast connection to help centers whenever you feel unsafe.", video: "/homeBanner/hb10.mp4" },
  { id: 11, title: "TRACKING",      subtitle: "LIVE FEED",     description: "Shared location for your loved ones so they know you are okay.", video: "/homeBanner/hb11.mp4" },
  { id: 12, title: "AUTHORITY",     subtitle: "CITY CONTROL",  description: "Direct alerts to city administrators for immediate action.", video: "/homeBanner/hb12.mp4" },
  { id: 13, title: "RESPONSE",      subtitle: "RAPID UNIT",    description: "Our rapid response units are always on standby for your safety.", video: "/homeBanner/hb13.mp4" },
  { id: 14, title: "ALERTS",        subtitle: "FLASH NOTIFY",  description: "Get real-time flash alerts for critical safety issues near you.", video: "/homeBanner/hb14.mp4" },
  { id: 15, title: "SECURITY",      subtitle: "NETWORK GRID",  description: "A wide grid of safety sensors protecting your entire neighborhood.", video: "/homeBanner/hb15.mp4" },
  { id: 16, title: "VIGILANCE",     subtitle: "ACTIVE PATROL", description: "Constant active patrols ensuring stability and peace in your area.", video: "/homeBanner/hb16.mp4" },
  { id: 17, title: "DETECTION",     subtitle: "SENSE TECH",    description: "Cutting-edge sensors that detect risk before it becomes a threat.", video: "/homeBanner/hb17.mp4" },
  { id: 18, title: "INTEGRATION",   subtitle: "UNIFIED HUB",   description: "A single control point for all your security and safety needs.", video: "/homeBanner/hb18.mp4" },
  { id: 19, title: "REACTION",      subtitle: "SMART ESCORT",  description: "Guidance and protection when walking through unknown areas.", video: "/homeBanner/hb19.mp4" },
];

export default function HomeBanner() {
  const [index, setIndex] = useState(0);
  const [videoReady, setVideoReady] = useState(false);

  const nextSlide = useCallback(() => {
    setIndex((prev) => (prev + 1) % BANNER_DATA.length);
  }, []);

  const selectSlide = useCallback((idx: number) => {
    setIndex(idx);
  }, []);

  const currentBanner = useMemo(() => BANNER_DATA[index], [index]);

  // Reset video ready state when slide changes
  useEffect(() => {
    setVideoReady(false);
  }, [index]);

  return (
    <div className="relative w-full h-auto lg:h-[85vh] min-h-[500px] overflow-hidden bg-black flex flex-col lg:flex-row mt-20 font-sans">
      
      {/* ── LEFT SIDE: VIDEO SECTION (65%) ── */}
      <div className="relative h-[55vh] lg:h-full w-full lg:w-[65%] overflow-hidden border-b lg:border-r border-white/5 bg-neutral-950">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full bg-neutral-950"
          >
            <video
              src={currentBanner.video}
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={nextSlide}
              onLoadedData={() => setVideoReady(true)}
              className="absolute inset-0 w-full h-full object-cover opacity-80"
              style={{ background: 'black' }}
            />
            
            {/* Smooth transition overlay to hide loading blink */}
            <motion.div 
               initial={{ opacity: 1 }} 
               animate={{ opacity: videoReady ? 0 : 1 }} 
               exit={{ opacity: 1 }} 
               transition={{ duration: 0.8 }} 
               className="absolute inset-0 bg-black z-10 pointer-events-none" 
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-[5]" />
            
            <div className="absolute bottom-10 lg:bottom-20 left-6 lg:left-20 z-10 max-w-2xl">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <div className="flex items-center gap-2 lg:gap-3 mb-4">
                  <div className="px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30">
                    <span className="text-[8px] lg:text-[10px] font-black text-primary uppercase tracking-widest">Live Feed</span>
                  </div>
                  <span className="text-[9px] lg:text-[10px] font-bold text-white/50 uppercase tracking-widest">
                    {currentBanner.title}
                  </span>
                </div>

                <h1 className="text-4xl md:text-8xl font-black text-white tracking-tighter leading-none mb-4 lg:mb-6 uppercase">
                  {currentBanner.subtitle.split(' ').map((word, i) => (
                    <span key={i} className={i === 1 ? "text-primary block" : "block"}>{word}</span>
                  ))}
                </h1>

                <p className="text-[11px] lg:text-base text-white/70 font-medium max-w-[240px] lg:max-w-sm mb-6 lg:mb-10 leading-relaxed uppercase">
                  {currentBanner.description}
                </p>

                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="h-0.5 w-8 lg:w-12 bg-primary" />
                  <span className="text-[9px] lg:text-xs font-black text-white/20">
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* HIDDEN PRELOADER FOR NEXT VIDEO */}
        <div className="hidden">
           <video src={BANNER_DATA[(index + 1) % BANNER_DATA.length].video} preload="auto" muted />
        </div>
      </div>

      {/* ── RIGHT SIDE: ACTION SECTION (35%) ── */}
      <div className="relative h-auto lg:h-full w-full lg:w-[35%] overflow-hidden flex flex-col justify-center px-8 lg:px-16 py-12 lg:py-0 bg-neutral-950">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-full h-full bg-primary/5 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-full h-full bg-accent-magenta/5 blur-[100px]" />
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <span className="text-[9px] lg:text-[10px] font-black text-primary uppercase tracking-[0.3em]">Join Shield</span>
            <h2 className="text-3xl lg:text-4xl font-black text-white leading-tight uppercase">
              Stay Safe <br /> <span className="text-primary italic">Everywhere.</span>
            </h2>
            <p className="text-neutral-500 text-xs lg:text-sm font-bold leading-relaxed max-w-xs uppercase">
              Join thousands who use SHIELD to stay safe. Start for free today. No credit card needed.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Map, title: "See Map", desc: "Know safe areas" },
              { icon: PhoneCall, title: "Quick Help", desc: "Get help fast" },
              { icon: Shield, title: "Very Safe", desc: "Private and secure" }
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-4 group cursor-default">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors">
                  <feat.icon className="w-4 h-4 lg:w-5 lg:h-5 text-neutral-500 group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="text-[10px] lg:text-xs font-black text-white uppercase tracking-widest leading-none">{feat.title}</p>
                  <p className="text-[8px] lg:text-[10px] text-neutral-600 font-bold uppercase mt-1">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 lg:pt-6">
            <Link
              href="/register"
              className="group w-full h-14 lg:h-16 flex items-center justify-center bg-white text-black font-black text-[11px] lg:text-sm uppercase tracking-[0.3em] rounded-xl hover:bg-primary hover:text-white transition-all duration-300"
            >
              Join SHIELD Now
              <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 right-10 hidden lg:flex flex-col gap-2 z-30">
        {BANNER_DATA.map((_, i) => (
          <button
            key={i}
            onClick={() => selectSlide(i)}
            className={`w-1 rounded-full transition-all duration-300 ${i === index ? 'h-8 bg-primary' : 'h-1.5 bg-white/20 hover:bg-white/40'}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
