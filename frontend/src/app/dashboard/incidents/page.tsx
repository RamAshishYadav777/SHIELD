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
      const res = await api.get('/incidents?verified=true');
      setIncidents(res.data.data);
    } catch (error) {
      toast.error('Failed to load incidents');
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
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Safety Reports</h1>
          <p className="text-text-secondary mt-1">Report what happened to help keep everyone safe.</p>
        </div>
        <Button 
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2"
        >
          {showAdd ? 'Cancel' : <><Plus size={20} /> Report Incident</>}
        </Button>
      </div>

      {showAdd && (
        <Card className="animate-in slide-in-from-top duration-500 overflow-hidden p-0">
          <div className="bg-gradient-to-r from-accent-orange/20 to-accent-magenta/20 p-6 border-b border-white/10">
            <h2 className="text-xl font-bold">New Safety Report</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Input 
                  label="Title" 
                  placeholder="e.g. Suspicious person near park" 
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, title: e.target.value})}
                  required
                />
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-secondary">Category</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-accent-orange"
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
                <Input 
                  label="Area / Address" 
                  placeholder="Street name or landmark" 
                  value={formData.address}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="space-y-4">
                 <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-secondary">Incident Details</label>
                  <textarea 
                    className="w-full h-32 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-accent-orange resize-none"
                    placeholder="Describe what happened..."
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, description: e.target.value})}
                    required
                  />
                </div>
                
                <div className="relative group cursor-pointer">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    onChange={handleImageChange}
                  />
                  {preview ? (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10">
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPreview(null); setImage(null); }}
                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors z-20"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-32 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-text-secondary group-hover:border-accent-orange group-hover:text-accent-orange transition-all">
                       <Upload size={24} className="mb-2" />
                       <span className="text-xs font-semibold">Attach Photo (Optional)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <Button className="w-full h-14 text-lg">Send Report</Button>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <p className="col-span-full text-center py-20 opacity-50">Loading reports...</p>
        ) : incidents.length === 0 ? (
          <Card className="col-span-full flex flex-col items-center justify-center py-20 text-center border-dashed">
            <AlertCircle size={48} className="text-text-secondary mb-4 opacity-20" />
            <p className="text-text-secondary">No incidents reported in your area yet.</p>
          </Card>
        ) : (
          incidents.map((incident) => (
            <Card key={incident._id} className="p-0 overflow-hidden flex flex-col group">
              <div className="relative h-48 w-full bg-white/5">
                {incident.images && incident.images.length > 0 ? (
                  <img src={incident.images[0]} alt={incident.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex flex-center items-center justify-center">
                    <Camera size={32} className="text-white/10" />
                  </div>
                )}
                <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
                  {incident.category}
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold">{incident.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-text-secondary mt-2">
                    <MapPin size={12} className="text-accent-orange" />
                    {incident.address || 'Location Shared'}
                  </div>
                </div>
                <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
                  {incident.description}
                </p>
                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-text-secondary font-semibold uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <Clock size={12} />
                    {new Date(incident.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight size={14} className="text-accent-magenta" />
                    Details
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
