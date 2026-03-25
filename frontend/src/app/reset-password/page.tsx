'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import api from '@/lib/api';
import toast from 'react-hot-toast';


import { Suspense } from 'react';

function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);



  const token = searchParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match');
    }
    setLoading(true);
    try {
      await api.post(`/auth/reset-password?token=${token}`, { password });
      setSuccess(true);
      toast.success('Key updated successfully');
      setTimeout(() => router.push('/login'), 3000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return <div className="min-h-screen bg-bg-primary flex items-center justify-center text-white">Invalid Access Token</div>;

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent-magenta/10 rounded-full blur-[120px] animate-pulse"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[450px] relative z-10"
      >
        <div className="glass p-8 md:p-12 rounded-[2rem] border-white/10 text-center">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 mb-6 flex items-center justify-center">
              <Image src="/shield_v10.png" alt="SHIELD Logo" width={80} height={80} className="object-contain" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Reset Password</h1>
            <p className="text-text-secondary text-sm font-medium">Create a new password for your account</p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4 text-left">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">New Pass-Key</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-accent-magenta transition-colors" />
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white outline-none focus:border-accent-magenta/50 focus:ring-4 focus:ring-accent-magenta/10 transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Confirm Key</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-accent-magenta transition-colors" />
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white outline-none focus:border-accent-magenta/50 focus:ring-4 focus:ring-accent-magenta/10 transition-all"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </div>

              <button 
                disabled={loading}
                className="w-full bg-linear-to-r from-accent-orange to-accent-magenta text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 transition-opacity disabled:opacity-70 group"
              >
                {loading ? 'Processing...' : (
                  <>
                    Save Password <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6 py-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <div className="text-green-500 font-bold text-xl">Key Update Successful</div>
              <p className="text-text-secondary text-sm">Your security protocol has been updated. Redirecting to terminal...</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary flex items-center justify-center"><Loader2 className="animate-spin text-accent-orange" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}



