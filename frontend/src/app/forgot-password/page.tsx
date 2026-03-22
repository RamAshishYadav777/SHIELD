'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      toast.success('Reset link dispatched');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center pt-32 pb-12 px-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent-orange/10 rounded-full blur-[120px] animate-pulse"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[450px] relative z-10"
      >
        <div className="glass p-8 md:p-12 rounded-[2rem] border-white/10 text-center">
            <div className="flex flex-col items-center mb-10">
              <div className="w-24 h-24 relative flex items-center justify-center mb-6 mx-auto">
                <Image src="/shield_v10.png" alt="SHIELD Logo" width={96} height={96} className="object-contain" />
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Reset Password</h1>
              <p className="text-text-secondary text-sm font-medium">Get a new password for your account</p>
            </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1 text-left">Registered Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-accent-orange transition-colors" />
                  <input 
                    type="email"
                    placeholder="agent@shield.org"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white outline-hidden focus:border-accent-orange/50 focus:ring-4 focus:ring-accent-orange/10 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button 
                disabled={loading}
                className="w-full bg-linear-to-r from-accent-orange to-accent-magenta text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 transition-opacity disabled:opacity-70 group"
              >
                {loading ? 'Dispatching...' : (
                  <>
                    Send Reset Link <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6 py-4">
              <div className="text-green-500 font-bold">Protocol initiated. Check your inbox.</div>
              <p className="text-text-secondary text-sm">If an account exists for {email}, you will receive a reset link shortly.</p>
              <Link href="/login" className="inline-flex items-center gap-2 text-accent-orange font-bold">
                <ArrowLeft className="w-4 h-4" /> Return to Terminal
              </Link>
            </div>
          )}

          {!submitted && (
            <Link href="/login" className="inline-flex items-center gap-2 mt-8 text-text-secondary hover:text-white transition-colors text-sm font-bold">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}



