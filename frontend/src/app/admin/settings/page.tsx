'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, Trash2, ShieldCheck, Phone,
  Mail, Eye, EyeOff, CheckCircle2, AlertTriangle, Save,
  ShieldAlert
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

type Tab = 'profile' | 'security' | 'danger';

export default function AdminSettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Profile state
  const [profileData, setProfileData] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Security state
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Danger zone
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.put('/users/profile', profileData);
      await refreshUser();
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setSavingPassword(true);
    try {
      await api.put('/users/profile', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Password change failed');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.email) {
      toast.error('Please type your email exactly to confirm deletion.');
      return;
    }
    setDeletingAccount(true);
    try {
      await api.delete('/users/me');
      toast.success('Admin account permanently deleted.');
      logout();
      router.push('/');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Deletion failed');
    } finally {
      setDeletingAccount(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'My Profile', icon: <User size={16} /> },
    { id: 'security', label: 'Security', icon: <Lock size={16} /> },
    { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle size={16} /> },
  ];

  return (
    <div className="space-y-12 max-w-4xl mx-auto pb-20">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-magenta/10 border border-accent-magenta/20 flex items-center justify-center">
                    <ShieldAlert className="text-accent-magenta" size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-magenta opacity-70">Account Control</span>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight italic">Admin <span className="text-white/40 not-italic">Settings</span></h1>
            <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest pl-1">Manage your admin profile and system security.</p>
        </div>
      </div>

      {/* Admin Summary Card */}
      <Card className="flex items-center gap-8 p-10 bg-neutral-900/40 backdrop-blur-3xl border-white/5 rounded-[3rem] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-magenta/5 blur-3xl pointer-events-none group-hover:bg-accent-magenta/10 transition-colors" />
        
        <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-accent-magenta to-[#B9055E] flex items-center justify-center text-4xl font-black text-white shrink-0 shadow-2xl shadow-accent-magenta/20">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <p className="text-3xl font-black uppercase tracking-tight">{user?.name}</p>
            <div className="px-3 py-1 rounded-full bg-accent-magenta/10 border border-accent-magenta/20 text-[8px] font-black uppercase tracking-[0.2em] text-accent-magenta">
                Master Admin
            </div>
          </div>
          <p className="text-sm text-neutral-500 font-bold uppercase tracking-widest">{user?.email}</p>
          <div className="flex items-center gap-2 mt-4">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
            <span className="text-[9px] text-neutral-400 font-black uppercase tracking-widest">Active System Authority</span>
          </div>
        </div>
        
        <div className="hidden md:block text-right shrink-0 px-8 py-4 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-md">
          <p className="text-[8px] uppercase tracking-[0.3em] text-neutral-600 font-black mb-1">Joined</p>
          <p className="text-lg font-black text-white italic">
            {user?.createdAt ? new Date(user.createdAt).toLocaleString('en-IN', { month: 'long', year: 'numeric' }) : '...'}
          </p>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-4 p-2 rounded-[2rem] bg-neutral-900/60 border border-white/10 backdrop-blur-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 flex items-center justify-center gap-3 h-16 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
              activeTab === tab.id
                ? tab.id === 'danger'
                  ? 'text-red-400'
                  : 'text-white shadow-2xl ring-1 ring-white/10'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="admin-tab-indicator"
                className={`absolute inset-0 rounded-[1.5rem] ${tab.id === 'danger' ? 'bg-red-500/10 border border-red-500/20 shadow-[0_10px_30px_rgba(239,68,68,0.1)]' : 'bg-white/10 border border-white/10 shadow-[0_10px_30px_rgba(255,255,255,0.05)]'}`}
                transition={{ type: 'spring', bounce: 0.1, duration: 0.5 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-3">{tab.icon}{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {activeTab === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }}>
            <Card className="p-12 bg-neutral-950/50 backdrop-blur-3xl border-white/10 rounded-[3.5rem] shadow-2xl">
              <div className="mb-10">
                <h2 className="text-2xl font-black uppercase italic tracking-tight mb-2">My Profile</h2>
                <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Update your name and phone number.</p>
              </div>
              <form onSubmit={handleProfileSave} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-4">Full Name</label>
                    <div className="relative">
                      <User size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-600" />
                      <input
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-16 pr-6 h-16 text-sm font-bold outline-none focus:border-accent-magenta transition-all"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        placeholder="Your name"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-4">Phone Number</label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-600" />
                      <input
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-16 pr-6 h-16 text-sm font-bold outline-none focus:border-accent-magenta transition-all"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        placeholder="+91 00000 00000"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-4">Email Address</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-600" />
                    <input
                      className="w-full bg-white/[0.01] border border-white/5 rounded-2xl pl-16 pr-6 h-16 text-sm font-bold outline-none opacity-40 cursor-not-allowed italic"
                      value={user?.email || ''}
                      disabled
                    />
                  </div>
                  <p className="text-[9px] text-neutral-600 uppercase font-black tracking-widest ml-4 italic">Authority email cannot be changed.</p>
                </div>
                <Button type="submit" disabled={savingProfile} className="w-full md:w-auto h-16 px-12 !rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-neutral-200 shadow-2xl transition-all active:scale-95">
                  {savingProfile ? 'Saving...' : <><Save size={18} className="mr-3" /> Save Changes</>}
                </Button>
              </form>
            </Card>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div key="security" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }}>
            <Card className="p-12 bg-neutral-950/50 backdrop-blur-3xl border-white/10 rounded-[3.5rem] shadow-2xl">
              <div className="mb-10">
                <h2 className="text-2xl font-black uppercase italic tracking-tight mb-2">Security</h2>
                <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Protect your authority access with a strong password.</p>
              </div>
              <form onSubmit={handlePasswordSave} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-4">Current Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-600" />
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-16 pr-16 h-16 text-sm font-bold outline-none focus:border-accent-magenta transition-all"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      required
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white transition-colors">
                      {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-4">New Password</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-600" />
                            <input
                                type={showNew ? 'text' : 'password'}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-16 pr-16 h-16 text-sm font-bold outline-none focus:border-accent-magenta transition-all"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                placeholder="Min. 6 characters"
                                required
                            />
                            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white transition-colors">
                            {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-4">Confirm New Password</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-600" />
                            <input
                                type="password"
                                className={`w-full bg-white/[0.03] border rounded-2xl pl-16 pr-6 h-16 text-sm font-bold outline-none transition-all ${
                                    passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword
                                    ? 'border-red-500/40 focus:border-red-500'
                                    : passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword
                                    ? 'border-green-500/40 focus:border-green-500'
                                    : 'border-white/10 focus:border-accent-magenta'
                                }`}
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                placeholder="Re-enter new password"
                                required
                            />
                        </div>
                    </div>
                </div>
                <Button type="submit" disabled={savingPassword} className="w-full md:w-auto h-16 px-12 !rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-neutral-200 shadow-2xl transition-all">
                  {savingPassword ? 'Updating...' : <><Lock size={18} className="mr-3" /> Update Password</>}
                </Button>
              </form>
            </Card>
          </motion.div>
        )}

        {activeTab === 'danger' && (
          <motion.div key="danger" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }}>
            <Card className="p-12 bg-red-950/10 backdrop-blur-3xl border border-red-500/20 rounded-[3.5rem] shadow-2xl">
              <div className="flex items-start gap-6 mb-10">
                <div className="w-16 h-16 rounded-[1.5rem] bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0 shadow-2xl">
                  <AlertTriangle className="text-red-500" size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase italic tracking-tight text-red-500 mb-2">Delete Admin Account</h2>
                  <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest leading-relaxed">
                    This will <span className="text-white">permanently</span> remove your administrative authority and all personal data from the SHIELD network. <span className="text-red-500">This action is final.</span>
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-4">
                        Type <span className="text-red-500 font-mono italic">{user?.email}</span> to confirm
                    </label>
                    <input
                        className="w-full bg-black/40 border border-red-500/20 rounded-2xl px-8 h-16 text-sm font-bold outline-none focus:border-red-500 transition-all font-mono text-white placeholder:text-neutral-800"
                        placeholder={user?.email}
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                    />
                </div>

                <Button
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount || deleteConfirm !== user?.email}
                    className="w-full h-20 bg-red-600 hover:bg-red-500 text-white !rounded-[2rem] border-none disabled:opacity-20 flex items-center justify-center gap-4 font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all"
                >
                    <Trash2 size={24} />
                    {deletingAccount ? 'Deleting...' : 'Permanently Delete Admin Access'}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
