"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Shield, 
  ArrowRight, 
  Mail, 
  ShieldCheck,
  Loader2,
  RefreshCw,
  Key
} from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Image from "next/image";

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(prev => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast.error("Please enter the full 6-digit code");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/verify-otp", { email, otp: otpString });
      toast.success("Account verified! You can now log in.");
      router.push("/login");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-otp", { email });
      toast.success("New code sent to your email.");
      setTimer(60);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white flex items-center justify-center pt-32 pb-12 px-6 relative overflow-hidden font-sans">
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,rgba(244,130,31,0.05)_0%,transparent_50%)] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-xl relative z-10"
      >
        <div className="bg-neutral-950/90 backdrop-blur-3xl p-10 md:p-14 rounded-[3rem] border border-white/5 space-y-10 text-center">
          <div className="inline-flex w-20 h-20 relative items-center justify-center mb-4">
             <Image src="/shield_v10.png" alt="SHIELD Logo" width={80} height={80} className="object-contain" />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">Verify Your Identity</h1>
            <p className="text-neutral-500 text-sm max-w-sm mx-auto">
              We've sent a 6-digit verification code to <span className="text-white font-bold">{email}</span>. Please enter it below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="flex justify-center gap-3 md:gap-4">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  autoFocus={i === 0}
                  className="w-12 h-16 md:w-14 md:h-20 bg-neutral-900 border border-white/5 rounded-2xl text-center text-2xl font-black focus:outline-none focus:border-primary/50 transition-all text-primary"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otp.join("").length !== 6}
              className="w-full bg-accent-gradient text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl hover:shadow-primary/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>Verify Account <ShieldCheck className="w-5 h-5" /></>
              )}
            </button>
          </form>

          <div className="pt-6 border-t border-white/5 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">
              Didn't receive the code?
            </p>
            <button 
              onClick={handleResend}
              disabled={timer > 0 || resending}
              className="inline-flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest hover:underline disabled:opacity-30 disabled:no-underline transition-all"
            >
              {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {timer > 0 ? `Resend Code in ${timer}s` : "Resend Code Now"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}
