'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  MapPin, 
  User as UserIcon,
  ShieldAlert,
  Calendar,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Incident {
  _id: string;
  title: string;
  description: string;
  category: string;
  isVerified: boolean;
  images: string[];
  createdAt: string;
  user: { name: string };
  location: {
    type: string;
    coordinates: number[];
    address?: string;
  };
}

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await api.get('/incidents');
      setIncidents(res.data.data);
    } catch (error) {
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      const res = await api.put(`/admin/incidents/verify/${id}`);
      setIncidents(prev => prev.map(inc => inc._id === id ? res.data.data : inc));
      toast.success('Verification status updated');
    } catch (error) {
      toast.error('Failed to update verification status');
    }
  };

  const handleDelete = async (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-4 p-2 min-w-[300px]">
        <div className="flex items-center gap-3">
          <Trash2 className="text-red-500" size={20} />
          <div>
            <p className="font-bold text-sm">Delete Incident Report?</p>
            <p className="text-xs text-text-secondary">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
          <Button 
            variant="secondary" 
            className="text-[10px] h-8 px-4" 
            onClick={() => toast.dismiss(t.id)}
          >
            Cancel
          </Button>
          <Button 
            className="text-[10px] h-8 px-4 bg-red-500 hover:bg-red-600 border-none" 
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await api.delete(`/admin/incidents/${id}`);
                setIncidents(prev => prev.filter(inc => inc._id !== id));
                toast.success('Incident report deleted successfully');
              } catch (error) {
                toast.error('Failed to delete incident report');
              }
            }}
          >
            Delete Now
          </Button>
        </div>
      </div>
    ), {
      duration: 5000,
      position: 'top-center',
      style: {
        background: '#0D0D0E',
        color: '#E2E2E2',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        padding: '8px'
      }
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ShieldAlert className="text-accent-magenta" />
          Incident Verification Control
        </h1>
        <p className="text-text-secondary mt-1">Review and verify community-reported incidents for public display.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <p className="text-center py-20 opacity-50 italic">Retrieving incident database...</p>
        ) : incidents.length === 0 ? (
          <Card className="text-center py-20 border-dashed">
            <p className="text-text-secondary">No incidents reported yet.</p>
          </Card>
        ) : (
          incidents.map((incident) => (
            <Card key={incident._id} className="overflow-hidden p-0 border-white/5 hover:border-white/10 transition-all">
              <div className="flex flex-col md:flex-row h-full">
                {/* Image Section */}
                <div className="w-full md:w-64 bg-white/5 relative">
                  {incident.images?.length > 0 ? (
                    <img src={incident.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-10">
                       <ShieldAlert size={48} />
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="flex-1 p-8 space-y-6">
                   <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-accent-orange px-2 py-0.5 rounded bg-accent-orange/10 border border-accent-orange/20">
                            {incident.category}
                          </span>
                          {incident.isVerified ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-green-500 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20">
                              <CheckCircle size={10} /> Verified
                            </span>
                          ) : (
                             <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-500 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                              <XCircle size={10} /> Pending
                            </span>
                          )}
                        </div>
                        <h2 className="text-2xl font-bold">{incident.title}</h2>
                      </div>
                      <div className="text-right text-xs text-text-secondary font-semibold">
                         <div className="flex items-center gap-2 mb-1 justify-end">
                            <UserIcon size={12} /> {incident.user?.name || 'Anonymous'}
                         </div>
                         <div className="flex items-center gap-2 justify-end">
                            <Calendar size={12} /> {new Date(incident.createdAt).toLocaleDateString()}
                         </div>
                      </div>
                   </div>

                   <p className="text-sm text-text-secondary leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5 italic">
                     "{incident.description}"
                   </p>

                   <div className="flex items-center justify-between pt-6 border-t border-white/5">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 uppercase tracking-tighter">
                          <MapPin size={12} className="text-accent-orange" />
                          <span>{incident.location?.address}</span>
                          {incident.location?.address && <span className="opacity-20 px-1">|</span>}
                          <span className="font-mono text-neutral-500">
                            GPS: {incident.location?.coordinates[1]?.toFixed(6)}, {incident.location?.coordinates[0]?.toFixed(6)}
                          </span>
                       </div>
                      <div className="flex gap-4">
                        <Button 
                          onClick={() => handleDelete(incident._id)}
                          className="flex items-center gap-2 text-xs bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20 hover:border-red-500/30"
                        >
                           <Trash2 size={14} /> Delete Report
                        </Button>
                        <Button variant="secondary" className="flex items-center gap-2 text-xs">
                           <ExternalLink size={14} /> Full Log
                        </Button>
                        <Button 
                          onClick={() => handleVerify(incident._id)}
                          className={`
                            flex items-center gap-2 text-xs px-8
                            ${incident.isVerified ? 'bg-orange-500/20 border-orange-500/30 text-orange-500 hover:bg-orange-500/30' : 'btn-primary'}
                          `}
                        >
                          {incident.isVerified ? (
                            <><XCircle size={14} /> Revoke Verification</>
                          ) : (
                            <><CheckCircle size={14} /> Approve Report</>
                          )}
                        </Button>
                      </div>
                   </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
