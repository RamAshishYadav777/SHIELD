'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  MapPin, 
  Camera, 
  AlertCircle,
  Clock,
  ChevronRight,
  Upload,
  X
} from 'lucide-react';
import { Card, Button, Input } from '@/components/ui';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useLocation } from '@/hooks/useLocation';

interface Incident {
  _id: string;
  title: string;
  description: string;
  category: string;
  address: string;
  images: string[];
  createdAt: string;
  user: { name: string };
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const location = useLocation();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Harassment',
    address: ''
  });

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await api.get('/incidents/my-reports');
      setIncidents(res.data.data);
    } catch (error) {
      toast.error('Failed to load your reports');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) {
      toast.error('Location access is required to report an incident');
      return;
    }

    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('category', formData.category);
    data.append('address', formData.address);
    data.append('coordinates', JSON.stringify(location));
    if (image) data.append('image', image);

    try {
      const res = await api.post('/incidents', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIncidents([res.data.data, ...incidents]);
      setShowAdd(false);
      resetForm();
      toast.success('Incident reported successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to report incident');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', category: 'Harassment', address: '' });
    setImage(null);
    setPreview(null);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight italic">Safety <span className="text-white/40 not-italic">Reports</span></h1>
          <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-2">Track the status of your reported incidents and community safety.</p>
        </div>
        <Button 
          onClick={() => setShowAdd(!showAdd)}
          className={`flex items-center gap-2 h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all ${showAdd ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-gradient-to-r from-accent-orange to-accent-magenta text-white shadow-xl shadow-accent-magenta/20'}`}
        >
          {showAdd ? <><X size={18} /> Close Panel</> : <><Plus size={20} /> Report Incident</>}
        </Button>
      </div>

      {showAdd && (
        <Card className="animate-in slide-in-from-top duration-500 overflow-hidden p-0 bg-neutral-900 border-white/5 rounded-[2.5rem] shadow-2xl border-none">
          <div className="bg-white/[0.02] p-8 border-b border-white/5">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <Camera size={24} className="text-accent-orange" />
              Submit Incident Report
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block ml-1">Incident Title</label>
                  <input 
                    className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-6 text-sm font-bold outline-none focus:border-accent-orange transition-all"
                    placeholder="Briefly describe the event" 
                    value={formData.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block ml-1">Category</label>
                  <select 
                    className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-accent-orange appearance-none cursor-pointer"
                    value={formData.category}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="Harassment">Harassment</option>
                    <option value="Physical Assault">Physical Assault</option>
                    <option value="Stalking">Stalking</option>
                    <option value="Suspicious Activity">Suspicious Activity</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block ml-1">Location Details</label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-600" />
                    <input 
                      className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl pl-16 pr-6 text-sm font-bold outline-none focus:border-accent-orange transition-all"
                      placeholder="Street name or landmark" 
                      value={formData.address}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                 <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block ml-1">Full Description</label>
                  <textarea 
                    className="w-full h-[152px] bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-sm font-bold outline-none focus:border-accent-orange resize-none"
                    placeholder="Provide specific details to help responders..."
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, description: e.target.value})}
                    required
                  />
                </div>
                
                <div className="relative group cursor-pointer h-14">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    onChange={handleImageChange}
                  />
                  {preview ? (
                    <div className="relative w-full h-14 rounded-2xl overflow-hidden border border-white/10 flex items-center gap-4 bg-white/[0.03] px-4">
                      <img src={preview} alt="Preview" className="w-8 h-8 rounded-lg object-cover" />
                      <span className="text-xs font-bold text-neutral-400 truncate flex-1">{image?.name}</span>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPreview(null); setImage(null); }}
                        className="p-1.5 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20 transition-colors z-20"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-14 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center gap-3 text-neutral-500 group-hover:border-accent-orange group-hover:text-accent-orange transition-all">
                       <Upload size={18} />
                       <span className="text-[10px] font-black uppercase tracking-widest">Attach Proof / Photo</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <Button className="w-full h-16 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-neutral-200 shadow-2xl transition-all">
               Submit Official Report
            </Button>
          </form>
        </Card>
      )}

      {/* ── REPORTS TABLE ── */}
      <Card className="bg-[#0F0C13] border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden border-none p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">Report Preview</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">Incident Details</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">Location & Date</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">Verification status</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-neutral-600 font-bold uppercase tracking-widest animate-pulse">
                    Synching with Safety Grid...
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <FileText size={48} />
                      <p className="text-sm font-black uppercase tracking-widest">No reports archived yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                incidents.map((incident: any) => (
                  <tr key={incident._id} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="px-8 py-6">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative shadow-lg">
                        {incident.images && incident.images.length > 0 ? (
                          <img src={incident.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-700">
                             <Camera size={20} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-accent-orange uppercase tracking-[0.2em]">{incident.category}</span>
                        <h4 className="text-sm font-bold text-white group-hover:text-accent-orange transition-colors">{incident.title}</h4>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-neutral-400 font-medium">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-white/60">
                          <MapPin size={12} className="text-accent-magenta" />
                          <span className="truncate max-w-[180px]">{incident.location?.address || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-600 font-bold uppercase tracking-widest mt-1">
                          <Clock size={12} />
                          {new Date(incident.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border ${
                        incident.isVerified 
                          ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                          : 'bg-accent-orange/10 text-accent-orange border-accent-orange/20'
                      }`}>
                         <div className={`w-1.5 h-1.5 rounded-full ${incident.isVerified ? 'bg-green-500' : 'bg-accent-orange animate-pulse'}`} />
                         {incident.isVerified ? 'Approved' : 'Pending'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-3 rounded-xl bg-white/5 text-neutral-400 hover:text-white hover:bg-accent-magenta/20 transition-all">
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
