'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import api from '@/lib/api';


import { Suspense } from 'react';

function VerifyEmailContent() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setStatus('error');
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      await api.get(`/auth/verify-email?token=${token}`);
      setStatus('success');
      setTimeout(() => router.push('/login'), 3000);
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center pt-32 pb-12 px-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-orange/5 rounded-full blur-[150px] animate-pulse"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[450px] relative z-10"
      >
        <div className="glass p-12 rounded-[2.5rem] border-white/10 text-center">
          <div className="logo-container mx-auto mb-10 flex justify-center w-24 h-24 relative">
             <Image src="/shield_v10.png" alt="SHIELD Logo" width={96} height={96} className="object-contain" />
          </div>

          {status === 'verifying' && (
            <div className="space-y-6">
              <Loader2 className="w-12 h-12 text-accent-orange animate-spin mx-auto" />
              <h2 className="text-2xl font-black text-white">Verifying Account</h2>
              <p className="text-text-secondary">Checking your security details...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <h2 className="text-2xl font-black text-white">Account Verified</h2>
              <p className="text-text-secondary">Your profile is ready. Taking you to login...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <XCircle className="w-12 h-12 text-danger mx-auto" />
              <h2 className="text-2xl font-black text-white">Verification Failed</h2>
              <p className="text-text-secondary">Something went wrong with the link. Please try again.</p>
              <button 
                onClick={() => router.push('/login')}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold hover:bg-white/10 transition-all"
              >
                Return to Login
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary flex items-center justify-center"><Loader2 className="animate-spin text-accent-orange" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}



