"use client";

import React, { useState, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Shield, ArrowRight, User, Mail, Phone, Lock,
  Loader2, ShieldAlert, Zap, Eye
} from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Image from "next/image";

// ─── UTILITIES ───────────────────────────────────────────────────────────────
const getInputClass = (admin: boolean) =>
  `w-full rounded-2xl py-4 pl-12 pr-4 text-sm font-bold bg-neutral-900/40 border transition-all duration-300 outline-none placeholder:text-neutral-700/50 ${
    admin
      ? "border-red-900/40 focus:border-red-500/50 focus:bg-red-500/5"
      : "border-white/5 focus:border-primary/40 focus:bg-primary/5"
  }`;

const getIconClass = (admin: boolean) =>
  `absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
    admin ? "text-red-900/40 group-focus-within:text-red-500" : "text-neutral-700 group-focus-within:text-primary"
  }`;

// ─── REGISTER CONTENT ────────────────────────────────────────────────────────
function RegisterContent() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = useMemo(() => searchParams.get("role") === "admin", [searchParams]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = isAdmin ? { ...formData, role: "admin" } : formData;
      await api.post("/auth/register", payload);
      toast.success("Account created!");
      router.push(`/verify-otp?email=${encodeURIComponent(formData.email)}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [formData, isAdmin, router]);

  const adminFeatures = useMemo(() => [
    { icon: Shield, text: "Full Control" },
    { icon: Lock, text: "Secure Data" }
  ], []);

  const userFeatures = useMemo(() => [
    { icon: Zap, text: "Very Fast", desc: "Ready in 1 minute" },
    { icon: Eye, text: "Stay Safe", desc: "Always here for you" },
    { icon: Lock, text: "Very Safe", desc: "Private and secure" }
  ], []);

  /* ─── ADMIN VARIANT ────────────────────────────────────── */
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center pt-32 pb-12 px-6 relative overflow-hidden font-sans">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 right-0 w-[60%] h-[60%] rounded-full bg-red-900/20 blur-[120px]" 
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl relative z-10"
        >
          <div className="relative group/card">
            <div className="absolute -inset-[1px] bg-gradient-to-br from-red-600/20 to-accent-magenta/20 rounded-[3rem] blur-[2px] opacity-20" />

            <div className="relative bg-neutral-950/80 backdrop-blur-3xl p-10 md:p-14 rounded-[3rem] border border-red-900/30 grid grid-cols-1 lg:grid-cols-5 gap-12 overflow-hidden shadow-2xl">
              <div className="lg:col-span-2 space-y-10 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-red-900/20 pb-10 lg:pb-0 lg:pr-10">
                <div className="relative w-24 h-24 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center group/icon">
                  <ShieldAlert className="w-12 h-12 text-red-500 relative z-10" />
                </div>
                <div className="space-y-4">
                  <span className="inline-flex px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-[8px] font-black uppercase tracking-[0.4em] text-red-500">Admin Account</span>
                  <h1 className="text-4xl font-black tracking-tight uppercase leading-[0.9]">Admin<br/><span className="text-red-500 italic">Area</span></h1>
                </div>
                <div className="space-y-5">
                  {adminFeatures.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-neutral-500 transition-colors hover:text-red-400">
                      <item.icon className="w-4 h-4 text-neutral-700" />
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-3">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2 group/input">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Your Name</label>
                    <div className="relative">
                      <User className={getIconClass(true)} />
                      <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter your full name" className={getInputClass(true)} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2 group/input">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Your Email</label>
                      <div className="relative">
                        <Mail className={getIconClass(true)} />
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" className={getInputClass(true)} required />
                      </div>
                    </div>
                    <div className="space-y-2 group/input">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Phone Number</label>
                      <div className="relative">
                        <Phone className={getIconClass(true)} />
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="0000000000" className={getInputClass(true)} required />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 group/input">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Choose Password</label>
                    <div className="relative">
                      <Lock className={getIconClass(true)} />
                      <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className={getInputClass(true)} required />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full relative group/btn-admin mt-4"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 to-accent-magenta rounded-2xl blur opacity-30 group-hover/btn-admin:opacity-70 transition duration-500" />
                    <div className="relative w-full bg-gradient-to-r from-red-600 to-accent-magenta text-white font-black text-sm uppercase tracking-[0.3em] py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50">
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Create Account <ArrowRight className="w-5 h-5 group-hover/btn-admin:translate-x-2 transition-transform duration-300" /></>}
                    </div>
                  </button>
                </form>
                <div className="mt-8 text-center">
                  <Link href="/login?role=admin" className="text-[10px] font-black uppercase tracking-widest text-neutral-600 hover:text-red-400 transition-colors">
                    Already have an account? <span className="underline decoration-red-900/50 underline-offset-4 ml-1">Sign In</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ─── USER VARIANT ────────────────────────────── */
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center pt-32 pb-12 px-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[120px]" 
        />
        <motion.div 
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-secondary/15 blur-[100px]" 
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl relative z-10"
      >
        <div className="relative group/card">
          <div className="absolute -inset-[1px] bg-gradient-to-br from-white/10 via-primary/20 to-secondary/20 rounded-[3rem] blur-[2px] opacity-20" />
          
          <div className="relative bg-neutral-900/40 backdrop-blur-3xl p-8 md:p-12 rounded-[3rem] border border-white/5 shadow-2xl grid grid-cols-1 lg:grid-cols-5 gap-12 overflow-hidden">
            <div className="lg:col-span-2 space-y-10 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/5 pb-10 lg:pb-0 lg:pr-10 relative z-10">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="relative inline-flex w-28 h-28 items-center justify-center group/logo"
              >
                <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl transition-all group-hover/logo:blur-3xl" />
                <Image src="/shield_v10.png" alt="SHIELD Logo" width={112} height={112} className="relative z-10 drop-shadow-[0_0_20px_rgba(244,130,31,0.4)]" />
              </motion.div>
              
              <div className="space-y-4">
                <h1 className="text-4xl font-black tracking-tight uppercase leading-[0.9] text-white">
                  Join <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Shield.</span>
                </h1>
                <p className="text-neutral-500 text-xs font-bold leading-relaxed max-w-[180px]">
                  The easiest way to stay safe in your city.
                </p>
              </div>

              <div className="space-y-6">
                {userFeatures.map((item, i) => (
                  <div key={i} className="group/item flex items-center gap-4 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-neutral-800/50 flex items-center justify-center border border-white/5 group-hover/item:border-primary/40 group-hover/item:bg-primary/5 transition-all">
                      <item.icon className="w-5 h-5 text-neutral-600 group-hover/item:text-primary transition-colors" />
                    </div>
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-widest text-neutral-300">{item.text}</div>
                      <div className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 space-y-8 relative z-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2 group/input">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 ml-1">Your Name</label>
                  <div className="relative">
                    <User className={getIconClass(false)} />
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter your full name" className={getInputClass(false)} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 group/input">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 ml-1">Your Email</label>
                    <div className="relative">
                      <Mail className={getIconClass(false)} />
                      <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" className={getInputClass(false)} required />
                    </div>
                  </div>
                  <div className="space-y-2 group/input">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 ml-1">Phone Number</label>
                    <div className="relative">
                      <Phone className={getIconClass(false)} />
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="0000000000" className={getInputClass(false)} required />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 group/input">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 ml-1">Choose Password</label>
                  <div className="relative">
                    <Lock className={getIconClass(false)} />
                    <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className={getInputClass(false)} required />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group/btn overflow-hidden"
                >
                  <div className="absolute -inset-0.5 bg-accent-gradient rounded-2xl blur opacity-30 group-hover/btn:opacity-60 transition duration-500" />
                  <div className="relative w-full bg-accent-gradient text-white font-black text-sm uppercase tracking-[0.3em] py-5 rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Create Account <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1.5 transition-transform duration-300" /></>}
                  </div>
                </button>
              </form>

              <div className="text-center pt-4">
                <Link href="/login" className="text-[10px] font-black uppercase tracking-widest text-neutral-600 hover:text-white transition-colors">
                  Already have an account? <span className="underline decoration-primary/50 underline-offset-4 ml-1">Sign In</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-accent-orange" /></div>}>
      <RegisterContent />
    </Suspense>
  );
}


