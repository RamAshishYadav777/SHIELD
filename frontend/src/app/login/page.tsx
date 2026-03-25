"use client";

import React, { useState, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, ArrowRight, Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Image from "next/image";

// ─── LOGIN CONTENT ───────────────────────────────────────────────────────────
function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const isAdmin = useMemo(() => searchParams.get("role") === "admin", [searchParams]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      
      if (isAdmin && res.data.user.role !== "admin") {
        toast.error("Access Denied. Admin credentials required.");
        setLoading(false);
        return;
      }

      if (!isAdmin && res.data.user.role === "admin") {
        toast.error("Please use the Admin Login area.");
        setLoading(false);
        return;
      }
      
      login(res.data.user);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  }, [email, password, isAdmin, login]);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);



  /* ─── ADMIN VARIANT ─────────────────────────────── */
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center pt-20 pb-8 px-6 relative overflow-hidden font-sans">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(185,5,94,0.15)_0%,transparent_60%)]" 
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md relative z-10"
        >
          <div className="relative group/card">
            <div className="absolute -inset-[1px] bg-gradient-to-br from-red-600/20 to-accent-magenta/20 rounded-[2.5rem] blur-[2px] opacity-20" />

            <div className="relative bg-neutral-950/80 backdrop-blur-3xl p-8 md:p-10 rounded-[2.5rem] border border-red-900/30 space-y-6 shadow-2xl">
              <div className="text-center space-y-4">
                <div className="relative inline-flex w-16 h-16 items-center justify-center mx-auto group/logo">
                  <ShieldAlert className="w-10 h-10 text-red-500 relative z-10" />
                </div>
                <div className="space-y-2">
                  <span className="inline-flex px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[8px] font-black uppercase tracking-[0.4em] text-red-500">Admin Login</span>
                  <h1 className="text-3xl font-black tracking-tight uppercase leading-[0.9]">Admin<br/><span className="text-red-500 italic">Area</span></h1>
                </div>
              </div>

              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/5 border border-red-500/15">
                <Shield className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-[10px] text-red-400/70 font-bold uppercase tracking-widest">
                  Please enter your admin details to login.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2 group/input">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-700 group-focus-within/input:text-red-500 transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@shield.net"
                      className="w-full bg-neutral-900/40 border border-red-900/20 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-red-500/50 focus:bg-red-500/5 transition-all placeholder:text-neutral-700/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 group/input">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Password</label>
                    <Link href="/forgot-password" title="Recover Password" className="text-[10px] text-red-400 font-black uppercase tracking-widest hover:text-white transition-all">
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-700 group-focus-within/input:text-red-500 transition-colors" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-neutral-900/40 border border-red-900/20 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-red-500/50 focus:bg-red-500/5 transition-all placeholder:text-neutral-700/50"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group/btn-admin mt-4"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 to-accent-magenta rounded-2xl blur opacity-30 group-hover/btn-admin:opacity-70 transition duration-500" />
                  <div className="relative w-full bg-gradient-to-r from-red-600 to-accent-magenta text-white font-black text-sm uppercase tracking-[0.3em] py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Login Now <ArrowRight className="w-5 h-5 group-hover/btn-admin:translate-x-2 transition-transform duration-300" /></>}
                  </div>
                </button>
              </form>

              <div className="pt-4 text-center">
                <Link href="/register?role=admin" className="text-[10px] font-black uppercase tracking-widest text-neutral-600 hover:text-red-400 transition-colors">
                  Create Admin Account →
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ─── USER VARIANT ────────────────────── */
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center pt-16 pb-6 px-6 relative overflow-hidden font-sans">
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
        className="w-full max-w-md relative z-10"
      >
        <div className="relative group/card">
          <div className="absolute -inset-[1px] bg-gradient-to-br from-white/10 via-primary/20 to-secondary/20 rounded-[2.5rem] blur-[2px] opacity-20" />

          <div className="relative bg-neutral-900/40 backdrop-blur-3xl p-8 md:p-10 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl overflow-hidden">
            <div className="text-center space-y-4 relative z-10">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="relative inline-flex w-20 h-20 items-center justify-center mx-auto group/logo"
              >
                <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl transition-all group-hover/logo:blur-3xl" />
                <Image src="/shield_v10.png" alt="SHIELD Logo" width={80} height={80} className="object-contain relative z-10 drop-shadow-[0_0_20px_rgba(244,130,31,0.4)]" />
              </motion.div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight uppercase leading-[0.9] text-white">Welcome <br/><span className="text-primary italic">Back.</span></h1>
                <p className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Login to your account</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              <div className="space-y-2 group/input">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-700 group-focus-within/input:text-primary transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full bg-neutral-900/40 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-primary/40 focus:bg-primary/5 transition-all placeholder:text-neutral-700/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 group/input">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Password</label>
                  <Link href="/forgot-password" title="Recover Access" className="text-[10px] text-primary font-black uppercase tracking-widest hover:text-white transition-all">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-700 group-focus-within/input:text-primary transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your security passcode"
                    className="w-full bg-neutral-900/40 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-primary/40 focus:bg-primary/5 transition-all placeholder:text-neutral-700/50"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full relative group/btn overflow-hidden mt-4"
              >
                <div className="absolute -inset-0.5 bg-accent-gradient rounded-2xl blur opacity-30 group-hover/btn:opacity-60 transition duration-500" />
                <div className="relative w-full bg-accent-gradient text-white font-black text-sm uppercase tracking-[0.3em] py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Login Now <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1.5 transition-transform duration-300" /></>}
                </div>
              </button>
            </form>

            <div className="text-center relative z-10 pt-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
                New to the system?{" "}
                <Link href="/register" className="text-primary hover:text-white transition-colors ml-1 font-black">
                  Sign Up Here →
                </Link>
              </p>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );

}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-accent-orange" /></div>}>
      <LoginContent />
    </Suspense>
  );
}

