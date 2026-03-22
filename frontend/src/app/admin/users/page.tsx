'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Shield, Mail, Phone, Clock,
  ArrowLeft, CheckCircle2, Lock, Unlock
} from 'lucide-react';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface UserData {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
  emergencyContacts?: any[];
  contactSlots?: number;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'user' | 'admin'>('user');
  const [selectedUserContacts, setSelectedUserContacts] = useState<UserData | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/admin/all');
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (error: any) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (userId: string) => {
    try {
      const res = await api.put(`/users/admin/block/${userId}`);
      if (res.data.success) {
        const updated = res.data.data;
        toast.success(updated.isBlocked ? 'User Blocked' : 'User Unblocked');
        setUsers(users.map(u => u._id === userId ? { ...u, isBlocked: updated.isBlocked } : u));
      }
    } catch (error: any) {
      toast.error('Block action failed');
    }
  };

  const filteredUsers = useMemo(() => users.filter(user => {
    const isSearchMatch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery);
    
    return isSearchMatch && user.role === filterRole;
  }), [users, searchQuery, filterRole]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
        <div>
          <Link href="/admin" className="text-accent-magenta text-[11px] font-black uppercase tracking-widest flex items-center gap-2 mb-3 hover:opacity-70 transition-opacity">
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-4">
            Manage <span className="text-accent-magenta">{filterRole === 'user' ? 'Users' : 'Admins'}</span>
            <span className="text-[10px] bg-accent-magenta/20 text-accent-magenta px-2 py-1 rounded-md border border-accent-magenta/30 font-black">V2.1 - STABLE</span>
          </h1>
          <p className="text-text-secondary mt-1 text-sm font-medium">
            Search and view registered systems members.
          </p>
        </div>
      </div>

      {/* Roles & Search Box */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent-magenta transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Search name, phone, email..."
            className="w-full bg-neutral-900 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold focus:outline-none focus:border-accent-magenta transition-all placeholder:text-neutral-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex p-1.5 bg-neutral-900 rounded-2xl border border-white/10 shrink-0">
          {(['user', 'admin'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-10 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                filterRole === role 
                  ? 'bg-accent-magenta text-white shadow-[0_10px_20px_rgba(185,5,94,0.3)]' 
                  : 'text-neutral-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {role}s
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats Card */}
      <div className="flex items-center gap-3 px-2 text-[10px] font-black uppercase tracking-widest text-neutral-600 italic">
         <Users size={14} />
         Total {filterRole}s Detected: {filteredUsers.length}
      </div>

      {/* Simple Result Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-40">
           <div className="w-12 h-12 border-4 border-accent-magenta/20 border-t-accent-magenta rounded-full animate-spin" />
           <p className="text-[10px] font-black uppercase tracking-[0.5em]">Syncing...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-40 bg-white/[0.01] border border-dashed border-white/5 rounded-3xl">
          <p className="text-text-secondary text-sm font-bold italic">No {filterRole}s found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/5 bg-neutral-950/50 backdrop-blur-3xl shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.03]">
                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary font-bold">Full Name</th>
                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary font-bold">Contact Information</th>
                <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary font-bold text-center">Account Status</th>
                <th className={`px-10 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary font-bold text-center w-[300px] ${filterRole === 'admin' ? 'hidden' : ''}`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user) => (
                <tr key={user._id} className={`transition-all ${user.isBlocked ? 'bg-red-500/5' : 'hover:bg-white/[0.03]'}`}>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border-2 ${
                        user.role === 'admin' 
                          ? 'bg-accent-magenta/10 border-accent-magenta/30 text-accent-magenta' 
                          : 'bg-white/5 border-white/10 text-white shadow-xl'
                      }`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className={`font-black text-[14px] leading-tight flex items-center gap-2 ${user.isBlocked ? 'line-through opacity-30 text-red-500' : ''}`}>
                          {user.name}
                          {user.role === 'admin' && <Shield size={14} className="text-accent-magenta" />}
                        </p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600 mt-0.5">{user.role} ID: {user._id.slice(-6).toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="space-y-1.5 font-bold">
                      <div className="flex items-center gap-2.5 text-xs text-white/50 lowercase tracking-tight">
                        <Mail size={13} className="text-accent-magenta opacity-50" /> {user.email}
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-white/50 tracking-tight">
                        <Phone size={13} className="text-accent-magenta opacity-50" /> {user.phone}
                      </div>
                      {filterRole === 'user' && (
                        <div className="mt-3 pt-2">
                          <button 
                            onClick={() => setSelectedUserContacts(user)}
                            className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-400 rounded-lg uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-lg"
                          >
                            View Contacts ({user.emergencyContacts?.length || 0})
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase border-2 ${
                      user.isBlocked 
                        ? 'bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                        : user.isVerified 
                          ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
                          : 'bg-accent-orange/10 border-accent-orange/30 text-accent-orange shadow-[0_0_15px_rgba(244,130,31,0.1)]'
                    }`}>
                      {user.isBlocked ? <Lock size={11} /> : user.isVerified ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                      {user.isBlocked ? 'Blocked' : user.isVerified ? 'Verified' : 'Pending'}
                    </div>
                  </td>
                  {filterRole === 'user' && (
                    <td className="px-10 py-6 text-center">
                        <button 
                          onClick={() => handleToggleBlock(user._id)}
                          className={`mx-auto h-11 px-10 font-black uppercase text-[10px] tracking-[0.2em] rounded-xl transition-all shadow-2xl border-none text-white`}
                          style={{ backgroundColor: user.isBlocked ? '#22c55e' : '#ff0000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                           {user.isBlocked ? <Unlock size={14} className="mr-3" /> : <Lock size={14} className="mr-3" />}
                           {user.isBlocked ? 'RESET USER' : 'BLOCK USER'}
                        </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Security Note Card */}
      <Card className="p-10 bg-white/[0.02] border border-white/5 rounded-[2.5rem] flex flex-col items-center text-center gap-4 transition-all hover:bg-white/[0.03] group">
        <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-white/10 flex items-center justify-center text-accent-magenta shadow-xl group-hover:scale-110 transition-transform duration-500">
           <Shield size={28} />
        </div>
        <p className="text-[11px] font-bold leading-relaxed max-w-2xl text-neutral-500 uppercase tracking-widest opacity-60">
           <span className="text-white">SYSTEM SECURITY:</span> Blocked users are immediately disconnected from all SHIELD emergency services. Admin profiles are protected by the Command-Level protocol.
        </p>
      </Card>

      {/* Contact Record Modal */}
      {selectedUserContacts && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedUserContacts(null)} />
          <div className="relative bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black uppercase italic tracking-tight mb-2">
              <span className="text-blue-500">{selectedUserContacts.name}'s</span> Contacts
            </h3>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-6">
              Total Contact Slots: {selectedUserContacts.contactSlots || 3}
            </p>

            <div className="space-y-3">
              {selectedUserContacts.emergencyContacts && selectedUserContacts.emergencyContacts.length > 0 ? (
                selectedUserContacts.emergencyContacts.map((contact: any, idx: number) => (
                  <div key={idx} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-white uppercase tracking-tight">{contact.name}</p>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5">{contact.relation}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-blue-400">{contact.phone}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-white/20 text-[10px] font-black uppercase tracking-[0.2em] italic">
                  No contacts found
                </div>
              )}
            </div>

            <button 
              onClick={() => setSelectedUserContacts(null)}
              className="mt-8 w-full py-4 bg-white/5 hover:bg-white/10 text-[11px] font-black uppercase tracking-[0.2em] text-white rounded-2xl transition-all"
            >
              Close Record
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
