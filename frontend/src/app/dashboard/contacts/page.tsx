'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Trash2, Phone, User, 
  Heart, MoreVertical, Mail, CreditCard, 
  Lock, ShieldCheck, Zap,
  ArrowRight
} from 'lucide-react';
import Image from 'next/image';
import Script from 'next/script';
import { Card, Button } from '@/components/ui';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { cacheData, getCachedData } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';

interface Contact {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  relation: string;
}

export default function ContactsPage() {
  const { user, refreshUser } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [formUnlocked, setFormUnlocked] = useState(false);
  
  const contactCredits = user?.contactSlots || 0;
  const isMaxLimit = contacts.length >= 3;
  const isAdditionPaid = contacts.length >= 1 && !formUnlocked;

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const nextContactOrdinal = getOrdinal(contacts.length + 1);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    relation: ''
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/users/contacts');
      const data = res.data.data;
      setContacts(data);
      await cacheData('contacts', data);
    } catch (error) {
      console.error('API fetch failed, trying cache...', error);
      const cached = await getCachedData('contacts');
      if (cached.length > 0) {
        setContacts(cached);
        toast('Using offline contact list', { icon: '📴' });
      } else {
        toast.error('Failed to load contacts');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/users/contacts', formData);
      setContacts(res.data.data);
      setShowAdd(false);
      setShowPaymentInfo(false);
      setFormUnlocked(false);
      setFormData({ name: '', phone: '', email: '', relation: '' });
      toast.success('Contact added successfully');
      await refreshUser(); // Update credit count
    } catch (error: any) {
      if (error.response?.status === 403) {
        setShowPaymentInfo(true);
        toast.error('Limit reached! Please unlock more slots.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to add contact');
      }
    }
  };

  const handlePayment = async () => {
    setIsPaying(true);
    try {
      // 1. Create Order on Backend
      const orderRes = await api.post('/payments/create-order');
      const { order_id, amount, key_id } = orderRes.data;

      // 2. Open Razorpay Checkout
      const options = {
        key: key_id,
        amount: amount,
        currency: "INR",
        name: "SHIELD Protection",
        description: "Emergency Contact Slot Upgrade",
        order_id: order_id,
        handler: async function (response: any) {
          try {
            // 3. Verify Payment
            await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            
            toast.success('Slot unlocked! You can now add more contacts.');
            await refreshUser();
            setFormUnlocked(true);
            setShowPaymentInfo(false);
            setShowAdd(true);
          } catch (err) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone
        },
        theme: {
          color: "#ff0000"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Payment system unavailable');
    } finally {
      setIsPaying(false);
    }
  };


  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/users/contacts/${id}`);
      setContacts(contacts.filter(c => c._id !== id));
      toast.success('Contact removed');
    } catch (error) {
      toast.error('Failed to remove contact');
    }
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center">
                    <Users className="text-accent-orange" size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-orange opacity-70">Safety</span>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight italic">Emergency <span className="text-white/40 not-italic">Contacts</span></h1>
            <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest pl-1">People who will be notified in case of an SOS alert.</p>
        </div>
        
        <Button 
          onClick={() => {
            if (isMaxLimit) {
              toast.error('Maximum limit reached (3 contacts max).');
              return;
            }
            if (isAdditionPaid) {
              setShowPaymentInfo(!showPaymentInfo);
              setShowAdd(false);
            } else {
              setShowAdd(!showAdd);
              setShowPaymentInfo(false);
              if (showAdd) setFormUnlocked(false);
            }
          }}
          disabled={isMaxLimit}
          className={`
            min-w-[200px] h-14 !rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-500
            ${isMaxLimit 
                ? 'bg-neutral-900 text-neutral-600 border-white/5 opacity-50' 
                : (isAdditionPaid 
                    ? 'bg-gradient-to-r from-accent-orange to-accent-magenta border-none text-white shadow-[0_15px_30px_rgba(244,130,31,0.2)] hover:scale-105' 
                    : 'bg-white text-black hover:bg-neutral-200'
                  )
            }
          `}
        >
          {showAdd || showPaymentInfo ? 'Cancel' : (
            isMaxLimit ? 
            <><Zap size={16} className="mr-2" /> LIMIT REACHED</> : 
            (isAdditionPaid ? 
              <><Lock size={16} className="mr-2" /> UNLOCK {nextContactOrdinal} CONTACT</> : 
              <><Plus size={20} className="mr-2" /> ADD CONTACT</>
            )
          )}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {showAdd && (contacts.length === 0 || formUnlocked) && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                <Card className="p-10 bg-neutral-950/50 backdrop-blur-3xl border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-accent-orange/5 blur-[80px] pointer-events-none" />
                    <form onSubmit={handleAdd} className="space-y-8 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-4">Full Name</label>
                                <input 
                                    placeholder="Enter contact name..." 
                                    className="w-full bg-white/[0.03] border border-white/10 h-14 rounded-2xl px-6 text-sm font-bold outline-none focus:border-accent-orange transition-all"
                                    value={formData.name}
                                    onChange={(e: any) => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-4">Phone Number</label>
                                <input 
                                    placeholder="+91 00000 00000" 
                                    className="w-full bg-white/[0.03] border border-white/10 h-14 rounded-2xl px-6 text-sm font-bold outline-none focus:border-accent-orange transition-all"
                                    value={formData.phone}
                                    onChange={(e: any) => setFormData({...formData, phone: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-4">Email Address</label>
                                <input 
                                    type="email"
                                    placeholder="contact@example.com" 
                                    className="w-full bg-white/[0.03] border border-white/10 h-14 rounded-2xl px-6 text-sm font-bold outline-none focus:border-accent-orange transition-all"
                                    value={formData.email}
                                    onChange={(e: any) => setFormData({...formData, email: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-4">Relation</label>
                                <input 
                                    placeholder="Friend / Family / Spouse" 
                                    className="w-full bg-white/[0.03] border border-white/10 h-14 rounded-2xl px-6 text-sm font-bold outline-none focus:border-accent-orange transition-all"
                                    value={formData.relation}
                                    onChange={(e: any) => setFormData({...formData, relation: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                        <Button className="w-full h-16 !rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-neutral-200">
                            Save Contact
                        </Button>
                    </form>
                </Card>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center opacity-30">
              <Zap size={32} className="animate-pulse mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-24 text-center border-dashed border-white/5 bg-transparent">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 opacity-30">
                <Users size={40} className="text-white" />
            </div>
            <p className="text-neutral-500 font-bold uppercase tracking-widest text-[11px]">No emergency contacts added yet.</p>
            <p className="text-[9px] text-accent-orange font-black uppercase tracking-[0.4em] mt-2 italic animate-pulse">Your 1st contact is FREE</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {contacts.map((contact, i) => (
                <motion.div 
                    key={contact._id} 
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: i * 0.1 }}
                >
                    <Card className="flex items-center justify-between p-8 bg-neutral-900/40 backdrop-blur-2xl border-white/5 hover:border-accent-orange/30 transition-all duration-500 group relative overflow-hidden rounded-[2.5rem]">
                        <div className="absolute bottom-0 right-0 w-48 h-48 bg-accent-orange/[0.02] blur-[60px] pointer-events-none" />
                        
                        <div className="flex items-center gap-8 min-w-0">
                            <div className="w-20 h-20 rounded-[2rem] bg-black border border-white/10 flex items-center justify-center relative group-hover:border-accent-orange transition-colors">
                                <span className="text-3xl font-black italic text-accent-orange opacity-80 group-hover:opacity-100 transition-opacity">{contact.name.charAt(0)}</span>
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-4 border-black group-hover:shadow-[0_0_10px_#22c55e] transition-all" />
                            </div>
                            
                            <div className="space-y-3 min-w-0">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-2xl font-black uppercase tracking-tight text-white/90 group-hover:text-white transition-colors">{contact.name}</h3>
                                    <span className="text-[8px] px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-500 font-black uppercase tracking-widest">
                                        {contact.relation}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-6">
                                    <div className="flex items-center gap-2 group/info">
                                        <div className="w-6 h-6 rounded-lg bg-accent-magenta/10 flex items-center justify-center border border-accent-magenta/20 group-hover/info:bg-accent-magenta transition-colors">
                                            <Phone size={10} className="text-accent-magenta group-hover/info:text-white" />
                                        </div>
                                        <span className="text-[11px] font-bold text-neutral-400 group-hover/info:text-white transition-colors">{contact.phone}</span>
                                    </div>
                                    {contact.email && (
                                        <div className="flex items-center gap-2 group/info">
                                            <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover/info:bg-blue-500 transition-colors">
                                                <Mail size={10} className="text-blue-400 group-hover/info:text-white" />
                                            </div>
                                            <span className="text-[11px] font-bold text-neutral-400 group-hover/info:text-white transition-colors truncate max-w-[200px]">{contact.email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => handleDelete(contact._id)}
                            className="w-14 h-14 bg-black/40 border border-white/5 text-neutral-600 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 rounded-2xl transition-all flex items-center justify-center"
                        >
                            <Trash2 size={24} />
                        </button>
                    </Card>
                </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPaymentInfo && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
                <motion.div 
                    initial={{ scale: 0.95, y: 20 }} 
                    animate={{ scale: 1, y: 0 }} 
                    exit={{ scale: 0.95, y: 20 }}
                    transition={{ type: "spring", duration: 0.6 }}
                    className="relative w-full max-w-md"
                >
                    <button 
                        onClick={() => setShowPaymentInfo(false)}
                        className="absolute -top-4 -right-4 w-10 h-10 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 hover:rotate-90 transition-all z-20"
                    >
                        <Plus className="rotate-45" size={20} />
                    </button>
                    
                    <Card className="bg-neutral-950 border-accent-orange/30 p-8 text-center relative overflow-hidden shadow-[0_0_100px_rgba(244,130,31,0.15)] rounded-[2.5rem]">
                        <div className="absolute inset-0 bg-gradient-to-br from-accent-orange/[0.03] to-magenta/[0.03]" />
                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                                <Lock className="text-accent-orange" size={32} />
                            </div>
                            <h3 className="text-3xl font-black uppercase italic mb-3 text-white">
                                Unlock {nextContactOrdinal} Slot
                            </h3>
                            <p className="text-neutral-500 font-bold uppercase tracking-widest text-[9px] max-w-xs mx-auto leading-relaxed mb-8">
                                Your 1st contact is free. To add more people, you need to pay a one-time fee.
                            </p>

                            <div className="relative mb-8 group/price inline-block">
                                <div className="absolute -inset-4 bg-accent-orange/20 rounded-full blur-3xl animate-pulse opacity-50" />
                                <div className="relative bg-white/[0.03] border border-white/10 rounded-2xl px-10 py-6 backdrop-blur-3xl group-hover:border-accent-orange transition-colors">
                                    <span className="text-[8px] font-black uppercase tracking-[0.4em] text-neutral-600 block mb-2">One-time Fee</span>
                                    <span className="text-white font-black text-5xl tracking-tighter">₹1000</span>
                                </div>
                            </div>
                       
                            <div className="flex justify-center">
                                <Button 
                                    onClick={handlePayment}
                                    disabled={isPaying}
                                    className="px-12 h-16 !rounded-2xl bg-white text-black font-black text-lg gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl w-full sm:w-auto"
                                >
                                    {isPaying ? 'Processing...' : <><Zap className="text-accent-orange" size={20} /> Pay & Unlock</>}
                                </Button>
                            </div>
                       
                            <div className="mt-6 flex items-center justify-center gap-3 text-neutral-700">
                                <div className="h-px w-8 bg-current opacity-20" />
                                <span className="text-[7px] font-black uppercase tracking-[0.3em]">Secure Transaction via Razorpay</span>
                                <div className="h-px w-8 bg-current opacity-20" />
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* ── SAFETY WIDGETS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
        <Card className="bg-neutral-900/40 backdrop-blur-md border-white/10 p-10 rounded-[3rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-orange/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center">
                    <Zap className="text-accent-orange" size={20} />
                </div>
                <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-accent-orange">Tips</span>
                    <h4 className="text-xl font-black uppercase italic tracking-tight">Safety Tip</h4>
                </div>
            </div>
            <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest leading-relaxed">
                These people will get an email with your location if you send an alert. Double-check that their email addresses are correct.
            </p>
        </Card>
        
        <Card className="bg-neutral-900/40 backdrop-blur-md border-white/10 p-10 rounded-[3rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-magenta/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center">
                    <CreditCard className="text-accent-magenta" size={20} />
                </div>
                <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-accent-magenta">Account</span>
                    <h4 className="text-xl font-black uppercase italic tracking-tight">Network Status</h4>
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">SOS Contacts</span>
                    <span className="text-xs font-black text-white">{contacts.length} / 3</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${(contacts.length/3) * 100}%` }} 
                        className="h-full bg-gradient-to-r from-accent-orange to-accent-magenta" 
                    />
                </div>
                {contacts.length >= 2 && (
                    <div className="flex items-center gap-2">
                        <div className="px-4 py-1.5 rounded-full bg-accent-orange/10 border border-accent-orange/20 text-[8px] font-black uppercase tracking-widest text-accent-orange">
                            Premium
                        </div>
                    </div>
                )}
            </div>
        </Card>
      </div>

      <Script 
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
    </div>
  );
}
