'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bell, Plus, X, Pin, Loader2, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../../lib/api';
import { timeFromNow } from '../../../lib/utils';

export default function AdminAnnouncementsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', campus: '', pinned: false });

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['all-announcements'],
    queryFn: () => adminApi.announcements().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createAnnouncement(data).then(r => r.data),
    onSuccess: () => {
      toast.success('Announcement posted!');
      setShowForm(false);
      setForm({ title: '', content: '', campus: '', pinned: false });
      qc.invalidateQueries({ queryKey: ['all-announcements'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to post'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) { toast.error('Please fill all required fields'); return; }
    createMutation.mutate({ ...form, campus: form.campus || undefined });
  };

  const list = announcements || [];

  return (
    <div className="space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Admin · Announcements</div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>Announcements</h1>
          <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>Post platform-wide or campus-specific announcements visible to all users.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> Post Announcement
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="section-title">New Announcement</div>
            <button onClick={() => setShowForm(false)} className="btn-ghost p-2"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Title *</label>
              <input className="input" placeholder="e.g., FFCS Deadline Extended"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="label">Content *</label>
              <textarea className="input" rows={4} placeholder="Write your announcement message..."
                value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Target Campus (optional)</label>
                <select className="input" value={form.campus} onChange={e => setForm({ ...form, campus: e.target.value })}>
                  <option value="">All Campuses</option>
                  <option value="VELLORE">VIT Vellore</option>
                  <option value="CHENNAI">VIT Chennai</option>
                  <option value="AP">VIT AP</option>
                  <option value="BHOPAL">VIT Bhopal</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded" checked={form.pinned}
                    onChange={e => setForm({ ...form, pinned: e.target.checked })} />
                  <span className="text-[13.5px] font-medium" style={{ color: '#64748B' }}>Pin this announcement</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid #E2E8F0' }}>
              <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Posting...</> : <><Megaphone className="h-4 w-4" /> Post Announcement</>}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="space-y-3">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-2xl" />
        )) : list.length === 0 ? (
          <div className="card p-12 text-center">
            <Bell className="h-10 w-10 mx-auto mb-3" style={{ color: '#94a3b8' }} />
            <p className="font-semibold" style={{ color: '#0F172A' }}>No announcements yet</p>
            <p className="text-[13px] mt-1" style={{ color: '#64748B' }}>Post an announcement to notify all users.</p>
          </div>
        ) : list.map((a: any) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: a.pinned ? 'rgba(217,119,6,0.1)' : 'rgba(30,64,175,0.08)' }}>
                {a.pinned ? <Pin className="h-4 w-4" style={{ color: '#d97706' }} /> : <Bell className="h-4 w-4" style={{ color: '#1e40af' }} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-[14px]" style={{ color: '#0F172A' }}>{a.title}</span>
                  {a.pinned && <span className="badge badge-amber">Pinned</span>}
                  {a.campus && <span className="badge badge-blue">{a.campus}</span>}
                  {!a.campus && <span className="badge badge-slate">All Campuses</span>}
                </div>
                <p className="text-[13.5px] leading-relaxed" style={{ color: '#64748B' }}>{a.content}</p>
                <div className="text-[11px] mt-2" style={{ color: '#94a3b8' }}>{timeFromNow(a.createdAt)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
