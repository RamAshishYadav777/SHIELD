'use client';

import React, { useState, useEffect } from 'react';
import { 
  History, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  MapPin,
  MessageSquare,
  CheckCircle2
} from 'lucide-react';
import Image from 'next/image';
import { Card } from '@/components/ui';
import api from '@/lib/api';

interface SOSRecord {
  _id: string;
  message: string;
  status: string;
  location: { coordinates: [number, number] };
  createdAt: string;
  resolvedAt?: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<SOSRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/sos/history');
      setHistory(res.data.data);
    } catch (error) {
      console.error('Error fetching SOS history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <History className="text-accent-orange" />
          Safety History
        </h1>
        <p className="text-text-secondary mt-1">Timeline of your past SOS alerts and safety arrivals.</p>
      </div>

      <div className="space-y-6">
        {loading ? (
          <p className="text-center py-20 opacity-50 italic">Retrieving history logs...</p>
        ) : history.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed">
             <Clock size={48} className="text-text-secondary mb-4 opacity-20" />
             <p className="text-text-secondary">No safety incidents recorded yet.</p>
          </Card>
        ) : (
          history.map((record) => (
            <Card key={record._id} className="relative overflow-hidden group hover:border-white/10 transition-all">
              {/* Status Indicator */}
              <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${record.status === 'resolved' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                   <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${record.status === 'resolved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                         <AlertTriangle size={24} />
                      </div>
                      <div>
                         <h3 className="text-xl font-bold uppercase tracking-tight">Alert Sent</h3>
                         <p className="text-xs text-text-secondary font-mono mt-1">ID: #{record._id.slice(-8)}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                        record.status === 'resolved' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500 animate-pulse'
                      }`}>
                         {record.status}
                      </span>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/5 p-6 rounded-2xl border border-white/5">
                   <div className="space-y-4">
                     <div className="flex items-center gap-3 text-sm">
                        <MessageSquare size={16} className="text-accent-orange" />
                        <span className="text-text-secondary italic">"{record.message || 'Standard SOS Alert'}"</span>
                     </div>
                     <div className="flex items-center gap-3 text-sm">
                        <MapPin size={16} className="text-accent-magenta" />
                        <span className="text-text-secondary">Coords: {record.location.coordinates[1].toFixed(4)}, {record.location.coordinates[0].toFixed(4)}</span>
                     </div>
                   </div>
                   <div className="space-y-4 text-sm md:border-l md:border-white/10 md:pl-8">
                      <div className="flex items-center gap-3">
                         <Clock size={16} className="text-text-secondary" />
                         <div>
                            <p className="text-[10px] uppercase font-bold text-text-secondary">Triggered At</p>
                            <p className="font-semibold">{new Date(record.createdAt).toLocaleString()}</p>
                         </div>
                      </div>
                      {record.resolvedAt && (
                        <div className="flex items-center gap-3">
                           <CheckCircle2 size={16} className="text-green-500" />
                           <div>
                              <p className="text-[10px] uppercase font-bold text-green-500">Resolved At</p>
                              <p className="font-semibold text-green-500/80">{new Date(record.resolvedAt).toLocaleString()}</p>
                           </div>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="bg-accent-magenta/5 border border-accent-magenta/10 p-6 rounded-2xl flex items-start gap-4">
         <div className="w-6 h-6 relative shrink-0">
            <Image src="/shield_v10.png" alt="SHIELD Logo" width={24} height={24} className="object-contain" />
         </div>
         <p className="text-xs text-text-secondary leading-relaxed">
           Your safety history is private and secure. These logs help keep a record of when you needed help.
         </p>
      </div>
    </div>
  );
}



