'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, Trash2, ShieldCheck, Phone,
  Mail, Eye, EyeOff, CheckCircle2, AlertTriangle, Save
} from 'lucide-react';
import { Card, Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

type Tab = 'profile' | 'security' | 'danger';

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Profile state
  const [profileData, setProfileData] = useState({ name: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync profile data when user loads
  React.useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

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
      toast.success('Account permanently deleted.');
      logout();
      router.push('/');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Deletion failed');
    } finally {
      setDeletingAccount(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User size={16} /> },
    { id: 'security', label: 'Security', icon: <Lock size={16} /> },
    { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle size={16} /> },
  ];

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your SHIELD account, security, and preferences.</p>
      </div>

      {/* Profile Summary Card */}
      <Card className="flex items-center gap-6 p-6 bg-white/5 border-white/10">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-orange to-accent-magenta flex items-center justify-center text-2xl font-black text-white shrink-0 shadow-lg shadow-accent-magenta/30">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold truncate">{user?.name}</p>
          <p className="text-sm text-text-secondary truncate">{user?.email}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <ShieldCheck size={12} className="text-green-500" />
            <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Verified Account</span>
          </div>
        </div>
        <div className="hidden md:block text-right shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">Member Since</p>
          <p className="text-sm font-bold text-white mt-0.5">
            {user?.createdAt ? new Date(user.createdAt).toLocaleString('en-IN', { month: 'long', year: 'numeric' }) : 'Retrieving...'}
          </p>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
              activeTab === tab.id
                ? tab.id === 'danger'
                  ? 'text-red-400'
                  : 'text-white'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                className={`absolute inset-0 rounded-xl ${tab.id === 'danger' ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/10 border border-white/10'}`}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">{tab.icon}{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {activeTab === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <Card className="p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Personal Information</h2>
                <p className="text-sm text-text-secondary">Update your display name and phone number.</p>
              </div>
              <form onSubmit={handleProfileSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-text-secondary">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                      <input
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none focus:border-accent-orange transition-all"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        placeholder="Your name"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-text-secondary">Phone Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                      <input
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none focus:border-accent-orange transition-all"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        placeholder="+91 XXXXX XXXXX"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-text-secondary">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none opacity-50 cursor-not-allowed"
                      value={user?.email || ''}
                      disabled
                      title="Email cannot be changed"
                    />
                  </div>
                  <p className="text-[10px] text-text-secondary opacity-60">Email address cannot be changed after registration.</p>
                </div>
                <Button type="submit" disabled={savingProfile} className="flex items-center gap-2 h-12 px-8">
                  {savingProfile ? 'Saving...' : <><Save size={16} /> Save Changes</>}
                </Button>
              </form>
            </Card>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <Card className="p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Change Password</h2>
                <p className="text-sm text-text-secondary">Use a strong password you don't use elsewhere.</p>
              </div>
              <form onSubmit={handlePasswordSave} className="space-y-5">
                {/* Current Password */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-text-secondary">Current Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-3.5 text-sm outline-none focus:border-accent-orange transition-all"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      required
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors">
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {/* New Password */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-text-secondary">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                      type={showNew ? 'text' : 'password'}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-3.5 text-sm outline-none focus:border-accent-orange transition-all"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Min. 6 characters"
                      required
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors">
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {passwordData.newPassword && (
                    <div className="flex gap-1 mt-2">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          passwordData.newPassword.length >= i * 3
                            ? i <= 1 ? 'bg-red-500' : i <= 2 ? 'bg-yellow-500' : i <= 3 ? 'bg-blue-500' : 'bg-green-500'
                            : 'bg-white/10'
                        }`} />
                      ))}
                    </div>
                  )}
                </div>
                {/* Confirm */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-text-secondary">Confirm New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                      type="password"
                      className={`w-full bg-white/5 border rounded-xl pl-10 pr-12 py-3.5 text-sm outline-none transition-all ${
                        passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword
                          ? 'border-red-500/50 focus:border-red-500'
                          : passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword
                          ? 'border-green-500/50 focus:border-green-500'
                          : 'border-white/10 focus:border-accent-orange'
                      }`}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Re-enter new password"
                      required
                    />
                    {passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && (
                      <CheckCircle2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                    )}
                  </div>
                </div>
                <Button type="submit" disabled={savingPassword} className="flex items-center gap-2 h-12 px-8">
                  {savingPassword ? 'Updating...' : <><Lock size={16} /> Update Password</>}
                </Button>
              </form>
            </Card>
          </motion.div>
        )}

        {activeTab === 'danger' && (
          <motion.div key="danger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <Card className="p-8 space-y-6 border-red-500/20 bg-red-500/5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
                  <AlertTriangle className="text-red-500" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-red-400 mb-1">Delete Account</h2>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    This will <span className="text-white font-bold">permanently</span> remove all your data — profile, SOS history, emergency contacts, and location records — from the SHIELD network. <span className="text-red-400 font-bold">This action cannot be undone.</span>
                  </p>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-red-400">What will be deleted:</p>
                <ul className="text-xs text-text-secondary space-y-1 list-disc pl-4 mt-2">
                  <li>Your profile and account credentials</li>
                  <li>All emergency contacts</li>
                  <li>Your entire SOS alert history</li>
                  <li>All saved Safe Zones</li>
                  <li>Payment and subscription records</li>
                </ul>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                  Type <span className="text-red-400 font-mono">{user?.email}</span> to confirm
                </label>
                <input
                  className="w-full bg-white/5 border border-red-500/20 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-red-500 transition-all font-mono"
                  placeholder={user?.email}
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                />
              </div>

              <Button
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirm !== user?.email}
                className="w-full h-12 bg-red-600 hover:bg-red-500 text-white border-none disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-black text-sm uppercase tracking-widest transition-all"
              >
                <Trash2 size={16} />
                {deletingAccount ? 'Deleting...' : 'Permanently Delete My Account'}
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
