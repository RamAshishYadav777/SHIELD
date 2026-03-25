"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Shield, Map, PhoneCall, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── DATA CONFIGURATION (Full 19 Reel System) ─────────────────────────────────
const BANNER_DATA = [
  { id: 1,  title: "DATA SECURE",  subtitle: "SAFE JOURNEY",  description: "YOUR PRIVATE INFORMATION AND LOCATION ARE ALWAYS SAFE WITH US.", video: "/homeBanner/hb1.mp4" },
  { id: 2,  title: "WATCHING",     subtitle: "ALWAYS SAFE",   description: "WE ARE ALWAYS HERE TO HELP YOU STAY SAFE THROUGHOUT THE DAY.", video: "/homeBanner/hb2.mp4" },
  { id: 3,  title: "QUICK HELP",    subtitle: "FAST ALERT",    description: "GET HELP INSTANTLY IF ANYTHING GOES WRONG DURING YOUR TRIP.", video: "/homeBanner/hb3.mp4" },
  { id: 4,  title: "PRIVATE",       subtitle: "DATA SECURE",   description: "YOUR PRIVATE INFORMATION AND LOCATION ARE ALWAYS SAFE WITH US.", video: "/homeBanner/hb4.mp4" },
  { id: 5,  title: "NEIGHBORS",     subtitle: "LOCAL SAFETY",  description: "KEEP YOUR NEIGHBORHOOD SAFE WITH OUR EASY REPORTING TOOL.", video: "/homeBanner/hb5.mp4" },
  { id: 6,  title: "SURVEILLANCE",  subtitle: "SMART EYES",    description: "ADVANCED MONITORING KEEPS EVERY CORNER OF YOUR CITY UNDER WATCH.", video: "/homeBanner/hb6.mp4" },
  { id: 7,  title: "PROTECTION",    subtitle: "INSTANT GUARD", description: "YOUR PERSONAL SECURITY CIRCLE IS JUST ONE TAP AWAY AT ANY TIME.", video: "/homeBanner/hb7.mp4" },
  { id: 8,  title: "ANALYTICS",     subtitle: "THREAT SCAN",   description: "WE USE SMART DATA TO FIND ANY DANGER BEFORE IT EVER REACHES YOU.", video: "/homeBanner/hb8.mp4" },
  { id: 9,  title: "COMMUNITY",     subtitle: "SHIELD WATCH",  description: "THOUSANDS OF USERS WORKING TOGETHER TO KEEP THE STREETS SAFE.", video: "/homeBanner/hb9.mp4" },
  { id: 10, title: "EMERGENCY",     subtitle: "SOS CONNECT",   description: "FAST CONNECTION TO HELP CENTERS WHENEVER YOU FEEL UNSAFE.", video: "/homeBanner/hb10.mp4" },
  { id: 11, title: "TRACKING",      subtitle: "LIVE FEED",     description: "SHARED LOCATION FOR YOUR LOVED ONES SO THEY KNOW YOU ARE OKAY.", video: "/homeBanner/hb11.mp4" },
  { id: 12, title: "AUTHORITY",     subtitle: "CITY CONTROL",  description: "DIRECT ALERTS TO CITY ADMINISTRATORS FOR IMMEDIATE ACTION.", video: "/homeBanner/hb12.mp4" },
  { id: 13, title: "RESPONSE",      subtitle: "RAPID UNIT",    description: "OUR RAPID RESPONSE UNITS ARE ALWAYS ON STANDBY FOR YOUR SAFETY.", video: "/homeBanner/hb13.mp4" },
  { id: 14, title: "ALERTS",        subtitle: "FLASH NOTIFY",  description: "GET REAL-TIME FLASH ALERTS FOR CRITICAL SAFETY ISSUES NEAR YOU.", video: "/homeBanner/hb14.mp4" },
  { id: 15, title: "SECURITY",      subtitle: "NETWORK GRID",  description: "A WIDE GRID OF SAFETY SENSORS PROTECTING YOUR ENTIRE NEIGHBORHOOD.", video: "/homeBanner/hb15.mp4" },
  { id: 16, title: "VIGILANCE",     subtitle: "ACTIVE PATROL", description: "CONSTANT ACTIVE PATROLS ENSURING STABILITY AND PEACE IN YOUR AREA.", video: "/homeBanner/hb16.mp4" },
  { id: 17, title: "DETECTION",     subtitle: "SENSE TECH",    description: "CUTTING-EDGE SENSORS THAT DETECT RISK BEFORE IT BECOMES A THREAT.", video: "/homeBanner/hb17.mp4" },
  { id: 18, title: "INTEGRATION",   subtitle: "UNIFIED HUB",   description: "A SINGLE CONTROL POINT FOR ALL YOUR SECURITY AND SAFETY NEEDS.", video: "/homeBanner/hb18.mp4" },
  { id: 19, title: "REACTION",      subtitle: "SMART ESCORT",  description: "GUIDANCE AND PROTECTION WHEN WALKING THROUGH UNKNOWN AREAS.", video: "/homeBanner/hb19.mp4" },
];

export default function HomeBanner() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [videoReady, setVideoReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [lastIndex, setLastIndex] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const nextSlide = useCallback(() => {
    setLastIndex(index);
    setDirection(1);
    setIndex((prev) => (prev + 1) % BANNER_DATA.length);
  }, [index]);

  const selectSlide = useCallback((idx: number) => {
    setLastIndex(index);
    setDirection(idx > index ? 1 : -1);
    setIndex(idx);
  }, [index]);

  const currentBanner = useMemo(() => BANNER_DATA[index], [index]);
  const prevBanner = useMemo(() => BANNER_DATA[lastIndex], [lastIndex]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', updateProgress);
    return () => video.removeEventListener('timeupdate', updateProgress);
  }, [index, videoReady]);

  useEffect(() => {
    setVideoReady(false);
    setProgress(0);
  }, [index]);

  const transitionVariants = {
    enter: {
      scale: 1.2,
      opacity: 0,
      filter: "blur(10px)",
    },
    center: {
      scale: 1,
      opacity: 1,
      filter: "blur(0px)",
      zIndex: 1,
    },
    exit: {
      scale: 0.9,
      opacity: 0,
      filter: "blur(10px)",
      zIndex: 0,
    }
  };

  return (
    <div className="relative w-full h-auto lg:h-[88vh] min-h-[600px] overflow-hidden bg-black flex flex-col lg:flex-row mt-20 font-sans border-b border-white/[0.03]">
      
      {/* ── LEFT SIDE: VIDEO SECTION ── */}
      <div className="relative h-[65vh] lg:h-full w-full lg:w-[65%] overflow-hidden bg-black border-b lg:border-r border-white/5">
        
        {/* PERSISTENT BACKGROUND (Shows the previous video to avoid black gap) */}
        <div className="absolute inset-0 z-0">
          {isMounted && (
            <video
              src={prevBanner.video}
              autoPlay
              muted
              playsInline
              loop
              className="absolute inset-0 w-full h-full object-cover opacity-40 blur-md grayscale-[0.2]"
            />
          )}
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={index}
            variants={transitionVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
                duration: 0.8,
                ease: [0.19, 1, 0.22, 1]
            }}
            className="absolute inset-0 w-full h-full z-10"
          >
            <div className="absolute inset-0 bg-neutral-900" />
            
            {isMounted && (
              <video
                ref={videoRef}
                src={currentBanner.video}
                autoPlay
                muted
                playsInline
                preload="auto"
                onEnded={nextSlide}
                onCanPlay={() => setVideoReady(true)}
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000",
                  videoReady ? "opacity-80" : "opacity-0"
                )}
              />
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-[5]" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent z-[5]" />
            
            {/* ── HUD ELEMENTS ── */}
            <div className="absolute inset-0 z-10 p-8 lg:p-20 flex flex-col justify-between">
              
              <div className="flex items-center gap-4">
                <div className="px-3 py-1 rounded-full bg-primary/20 border border-primary text-[10px] font-black text-primary uppercase tracking-widest">
                  Live Feed
                </div>
                <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
                  Private
                </div>
              </div>

              <div className="max-w-2xl">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <h1 className="text-7xl lg:text-[140px] font-black leading-[0.85] tracking-tighter uppercase mb-6">
                    <span className="block text-white">
                      {currentBanner.subtitle.split(' ')[0]}
                    </span>
                    <span className="block text-primary italic">
                      {currentBanner.subtitle.split(' ').slice(1).join(' ') || 'SHIELD'}
                    </span>
                  </h1>
                  <p className="text-[10px] lg:text-xs font-black text-white/50 tracking-[0.2em] max-w-sm leading-relaxed uppercase">
                    {currentBanner.description}
                  </p>
                </motion.div>
              </div>

              <div className="flex items-center gap-6">
                <div className="w-24 lg:w-40 h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-primary shadow-[0_0_10px_#F4821F]"
                  />
                </div>
                <span className="text-[10px] font-black text-white/30 font-mono tracking-tighter">
                   {(index + 1).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── RIGHT SIDE: ACTION SECTION ── */}
      <div className="relative h-auto lg:h-full w-full lg:w-[35%] overflow-hidden flex flex-col justify-center px-8 lg:px-20 py-20 lg:py-0 bg-neutral-950">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-full h-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-full h-full bg-accent-magenta/5 blur-[120px]" />
        </div>

        <div className="relative z-10 space-y-12 text-left">
          <div className="space-y-4">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Join Shield</span>
            <h2 className="text-4xl lg:text-5xl font-black text-white leading-none uppercase tracking-tighter">
              Stay Safe <br /> <span className="text-primary italic">Everywhere.</span>
            </h2>
            <p className="text-neutral-500 text-[11px] lg:text-xs font-bold leading-relaxed max-w-xs uppercase tracking-tight">
              Join thousands who use SHIELD to stay safe. Start for free today. No credit card needed.
            </p>
          </div>

          <div className="space-y-6">
            {[
              { icon: Map, title: "See Map", desc: "Know safe areas" },
              { icon: PhoneCall, title: "Quick Help", desc: "Get help fast" },
              { icon: Shield, title: "Very Safe", desc: "Private and secure" }
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-6 group cursor-default">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-all duration-500">
                  <feat.icon className="w-5 h-5 text-neutral-500 group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-white uppercase tracking-widest leading-none mb-1.5 group-hover:text-primary transition-colors">{feat.title}</p>
                  <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-tight">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 relative">
            <Link
              href="/register"
              className="group relative w-full h-16 lg:h-20 flex items-center justify-center bg-white text-black font-black text-xs lg:text-sm uppercase tracking-[0.4em] rounded-2xl overflow-hidden shadow-2xl transition-all duration-500"
            >
              <span className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <span className="relative z-10 flex items-center gap-4 group-hover:text-white transition-colors leading-none">
                 Join SHIELD Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-500" />
              </span>
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 right-12 hidden lg:flex flex-col gap-3 z-40 bg-black/20 backdrop-blur-md p-2 rounded-full border border-white/5 max-h-[400px] overflow-y-auto no-scrollbar">
        {BANNER_DATA.map((_, i) => (
          <button
            key={i}
            onClick={() => selectSlide(i)}
            className={cn(
              "w-1.5 rounded-full transition-all duration-500 flex-shrink-0",
              i === index ? "h-10 bg-primary shadow-[0_0_8px_#F4821F]" : "h-1.5 bg-white/10 hover:bg-white/40"
            )}
            aria-label={`Mode 0${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
