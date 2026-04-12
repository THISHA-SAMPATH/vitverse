'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Upload, Calendar, MapPin, Users, Clock, ChevronRight,
  Plus, X, CheckCircle, AlertCircle, FileText, Image, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import { formatDate } from '../../../lib/utils';

const CATEGORIES = ['Technical', 'Cultural', 'Sports', 'Academic', 'Workshop', 'Seminar', 'Competition', 'Social'];

function SkeletonRow() {
  return (
    <tr>
      <td className="px-4 py-3"><div className="skeleton h-5 w-40" /></td>
      <td className="px-4 py-3"><div className="skeleton h-5 w-24" /></td>
      <td className="px-4 py-3"><div className="skeleton h-5 w-20" /></td>
      <td className="px-4 py-3"><div className="skeleton h-6 w-16 rounded-full" /></td>
    </tr>
  );
}

export default function PresidentEventsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', venue: '', campus: user?.campus || 'CHENNAI',
    startDateTime: '', endDateTime: '', registrationDeadline: '',
    capacity: '', category: 'Technical', tags: '', points: '10',
    entryFee: '0', teamSize: '1', isTeamEvent: false,
    prizePool: '', certificateEligible: true,
  });

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['president-events', user?.id],
    queryFn: () => eventsApi.list({ limit: 50, createdBy: user?.id, includeAll: true }).then((r) => r.data),
    enabled: !!user?.id,
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => eventsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Event submitted for admin approval!');
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['president-events'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Submission failed'),
  });

  const events = eventsData?.data || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.startDateTime || !form.endDateTime) {
      toast.error('Please fill in all required fields');
      return;
    }
    submitMutation.mutate({
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      capacity: parseInt(form.capacity) || 100,
      points: parseInt(form.points) || 10,
      entryFee: parseFloat(form.entryFee) || 0,
      teamSize: parseInt(form.teamSize) || 1,
    });
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'badge-amber',
    PUBLISHED: 'badge-blue',
    LIVE: 'badge-green',
    COMPLETED: 'badge-slate',
    CANCELLED: 'badge-red',
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>President · Events</div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>Submit Events for Approval</h1>
          <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>
            Submit upcoming events to admin for review. Approved events go live on the platform.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> New Event
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="section-title">Submit New Event</div>
            <button onClick={() => setShowForm(false)} className="btn-ghost p-2"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label">Event Title *</label>
              <input className="input" placeholder="e.g., National Level Hackathon 2025"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={3} placeholder="Describe your event, objectives, and activities..."
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Venue / Location *</label>
              <input className="input" placeholder="e.g., Anna Auditorium, Block 1"
                value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Start Date & Time *</label>
              <input type="datetime-local" className="input"
                value={form.startDateTime} onChange={e => setForm({ ...form, startDateTime: e.target.value })} required />
            </div>
            <div>
              <label className="label">End Date & Time *</label>
              <input type="datetime-local" className="input"
                value={form.endDateTime} onChange={e => setForm({ ...form, endDateTime: e.target.value })} required />
            </div>
            <div>
              <label className="label">Registration Deadline</label>
              <input type="datetime-local" className="input"
                value={form.registrationDeadline} onChange={e => setForm({ ...form, registrationDeadline: e.target.value })} />
            </div>
            <div>
              <label className="label">Capacity (seats)</label>
              <input type="number" className="input" placeholder="100"
                value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <div>
              <label className="label">Entry Fee (₹)</label>
              <input type="number" className="input" placeholder="0"
                value={form.entryFee} onChange={e => setForm({ ...form, entryFee: e.target.value })} />
            </div>
            <div>
              <label className="label">FFCS Points</label>
              <input type="number" className="input" placeholder="10"
                value={form.points} onChange={e => setForm({ ...form, points: e.target.value })} />
            </div>
            <div>
              <label className="label">Prize Pool</label>
              <input className="input" placeholder="e.g., ₹50,000"
                value={form.prizePool} onChange={e => setForm({ ...form, prizePool: e.target.value })} />
            </div>
            <div>
              <label className="label">Tags (comma separated)</label>
              <input className="input" placeholder="hackathon, coding, team"
                value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" checked={form.certificateEligible}
                  onChange={e => setForm({ ...form, certificateEligible: e.target.checked })} />
                <span className="text-[13px] font-medium" style={{ color: '#64748B' }}>Certificate Eligible</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" checked={form.isTeamEvent}
                  onChange={e => setForm({ ...form, isTeamEvent: e.target.checked })} />
                <span className="text-[13px] font-medium" style={{ color: '#64748B' }}>Team Event</span>
              </label>
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2" style={{ borderTop: '1px solid #E2E8F0' }}>
              <button type="submit" className="btn-primary" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : <><Upload className="h-4 w-4" /> Submit for Approval</>}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Events table */}
      <div className="card">
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="section-title">Your Events</div>
          <span className="badge badge-slate">{events.length} total</span>
        </div>
        <div className="table-wrapper mt-4 border-0 rounded-none border-t" style={{ borderColor: '#E2E8F0' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Venue</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Registrations</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />) :
                events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12" style={{ color: '#64748B' }}>
                      <Upload className="h-8 w-8 mx-auto mb-2" style={{ color: '#94a3b8' }} />
                      <p>No events submitted yet. Click &quot;New Event&quot; to get started.</p>
                    </td>
                  </tr>
                ) : events.map((event: any) => (
                  <tr key={event.id}>
                    <td>
                      <div className="font-semibold text-[13px]" style={{ color: '#0F172A' }}>{event.title}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: '#64748B' }}>{event.category || 'General'}</div>
                    </td>
                    <td className="text-[13px]" style={{ color: '#64748B' }}>
                      {event.startDateTime ? formatDate(event.startDateTime) : '—'}
                    </td>
                    <td className="text-[13px]" style={{ color: '#64748B' }}>{event.venue || '—'}</td>
                    <td className="text-[13px]" style={{ color: '#0F172A' }}>{event.capacity || '—'}</td>
                    <td><span className={`badge ${statusColors[event.status] || 'badge-slate'}`}>{event.status}</span></td>
                    <td className="text-[13px] font-semibold" style={{ color: '#0F172A' }}>{event._count?.registrations || 0}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Info panel */}
      <div className="card p-5" style={{ background: 'rgba(37,99,235,0.03)', borderColor: 'rgba(37,99,235,0.15)' }}>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#2563eb' }} />
          <div>
            <div className="font-semibold text-[13.5px]" style={{ color: '#0F172A' }}>How Event Approval Works</div>
            <div className="text-[13px] mt-1 space-y-1" style={{ color: '#64748B' }}>
              <p>1. Submit your event — it enters <strong>DRAFT</strong> status pending admin review.</p>
              <p>2. Admin checks for schedule conflicts using Gantt chart analysis.</p>
              <p>3. Once approved, the event is <strong>PUBLISHED</strong> and visible to all students.</p>
              <p>4. Students can then register and book seats for your event.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
