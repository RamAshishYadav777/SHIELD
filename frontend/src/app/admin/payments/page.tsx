'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, Search, Shield, ArrowLeft, CheckCircle2, Clock, IndianRupee
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface PaymentData {
  _id: string;
  user: { _id: string, name: string, email: string };
  orderId: string;
  paymentId?: string;
  amount: number;
  currency: string;
  status: string;
  purpose: string;
  createdAt: string;
}

export default function PaymentsManagementPage() {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payments/admin/all');
      if (res.data.success) {
        setPayments(res.data.data);
        setTotalRevenue(res.data.totalAmount);
      }
    } catch (error: any) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = useMemo(() => payments.filter(payment => {
    return (
      payment.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.user?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.paymentId?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }), [payments, searchQuery]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
        <div>
          <Link href="/admin" className="text-accent-magenta text-[11px] font-black uppercase tracking-widest flex items-center gap-2 mb-3 hover:opacity-70 transition-opacity">
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-4">
            Manage <span className="text-accent-magenta">Payments</span>
            <span className="text-[10px] bg-accent-magenta/20 text-accent-magenta px-2 py-1 rounded-md border border-accent-magenta/30 font-black">V1.0 - STABLE</span>
          </h1>
          <p className="text-text-secondary mt-1 text-sm font-medium">
            Monitor all transactions and revenue within the system.
          </p>
        </div>
      </div>

      {/* Stats & Search Box */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent-magenta transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Search by name, email, order ID..."
            className="w-full bg-neutral-900 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold focus:outline-none focus:border-accent-magenta transition-all placeholder:text-neutral-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col items-center justify-center px-10 py-2.5 bg-neutral-900 rounded-2xl border border-white/10 shrink-0 min-w-[200px]">
           <span className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mb-1">Total Revenue</span>
           <span className="text-2xl font-black text-accent-magenta flex items-center">
             <IndianRupee size={20} className="mr-1" />
             {totalRevenue.toLocaleString('en-IN')}
           </span>
        </div>
      </div>

      {/* Main Stats Card */}
      <div className="flex items-center gap-3 px-2 text-[10px] font-black uppercase tracking-widest text-neutral-600 italic">
         <CreditCard size={14} />
         Total Transactions: {filteredPayments.length}
      </div>

      {/* Result Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-40">
           <div className="w-12 h-12 border-4 border-accent-magenta/20 border-t-accent-magenta rounded-full animate-spin" />
           <p className="text-[10px] font-black uppercase tracking-[0.5em]">Syncing...</p>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-40 bg-white/[0.01] border border-dashed border-white/5 rounded-3xl">
          <p className="text-text-secondary text-sm font-bold italic">No payments found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/5 bg-neutral-950/50 backdrop-blur-3xl shadow-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.03]">
                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">User Info</th>
                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">Transaction Details</th>
                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">Amount</th>
                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPayments.map((payment) => (
                <tr key={payment._id} className="transition-all hover:bg-white/[0.03]">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border-2 border-white/10 flex items-center justify-center font-black text-lg text-white shadow-xl">
                        {payment.user?.name ? payment.user.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="font-black text-[14px] leading-tight flex items-center gap-2">
                          {payment.user?.name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-white/50 tracking-tight mt-1">{payment.user?.email || 'No email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="space-y-1.5 font-bold">
                      <div className="flex items-center gap-2 text-[10px] text-white/50 uppercase tracking-widest">
                        <span className="text-accent-magenta">ORDER:</span> {payment.orderId || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-white/50 uppercase tracking-widest">
                        <span className="text-accent-orange">PAYMENT ID:</span> {payment.paymentId || 'Pending'}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-white/50 uppercase tracking-widest mt-1">
                         {new Date(payment.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className="font-black text-[16px] flex items-center tracking-tight text-white">
                      <IndianRupee size={16} className="text-neutral-500 mr-1" />
                      {payment.amount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mt-1 block">
                       {payment.purpose.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase border-2 shadow-2xl min-w-[100px] ${
                      payment.status === 'success' 
                        ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                        : 'bg-accent-orange/10 border-accent-orange/30 text-accent-orange'
                    }`}>
                      {payment.status === 'success' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                      {payment.status}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Security Note Card */}
      <Card className="p-10 bg-white/[0.02] border border-white/5 rounded-[2.5rem] flex flex-col items-center text-center gap-4 transition-all hover:bg-white/[0.03] group mt-8">
        <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-white/10 flex items-center justify-center text-accent-magenta shadow-xl group-hover:scale-110 transition-transform duration-500">
           <Shield size={28} />
        </div>
        <p className="text-[11px] font-bold leading-relaxed max-w-2xl text-neutral-500 uppercase tracking-widest opacity-60">
           <span className="text-white">FINANCIAL SECURITY:</span> All payment operations are heavily monitored. Sensitive transaction keys and signatures are encrypted. If anomalies are detected, contact the payment gateway provider immediately.
        </p>
      </Card>
    </div>
  );
}
