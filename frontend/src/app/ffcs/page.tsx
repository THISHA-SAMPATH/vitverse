'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BookOpen, CheckCircle, Clock, XCircle, Plus, Upload,
  Loader2, Sparkles, ShieldCheck, FileText, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { focApi, usersApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { formatDate } from '../../lib/utils';

const ACTIVITY_TYPES = [
  'Club Membership', 'Event Participation', 'Volunteering',
  'Leadership Role', 'Workshop', 'Cultural Event', 'Sports', 'Technical Project',
];
const SEMESTERS = ['Winter 2024–25', 'Fall 2024', 'Summer 2024', 'Winter 2023–24'];

const STATUS_CONFIG: Record<string, any> = {
  APPROVED: { badge: 'badge-green', icon: CheckCircle, color: '#059669' },
  PENDING: { badge: 'badge-amber', icon: Clock, color: '#d97706' },
  REJECTED: { badge: 'badge-red', icon: XCircle, color: '#ef4444' },
  COMPLETED: { badge: 'badge-green', icon: CheckCircle, color: '#059669' },
};

function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export default function FFCSPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [form, setForm] = useState({ clubId: '', activityType: '', description: '', hours: '', semester: SEMESTERS[0] });

  const handleDownloadReport = async () => {
    const sem = progress?.semester || SEMESTERS[0];
    setDownloadingReport(true);
    try {
      const { data } = await focApi.reportPdf(sem);
      const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FOC_Report_${sem.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report PDF downloaded!');
    } catch (err) {
      toast.error('Failed to download report PDF');
    } finally {
      setDownloadingReport(false);
    }
  };

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['ffcs-progress'],
    queryFn: () => focApi.progress().then((r) => r.data),
  });

  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['ffcs-activities'],
    queryFn: () => focApi.myActivities().then((r) => r.data),
  });

  const { data: myClubs } = useQuery({
    queryKey: ['my-clubs-for-ffcs'],
    queryFn: () => usersApi.myClubs().then((r) => r.data),
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => focApi.submit(data).then((r) => r.data),
    onSuccess: () => {
      toast.success('Activity submitted for review!');
      setShowForm(false);
      setForm({
        clubId: myClubs?.length === 1 ? myClubs[0].club.id : '',
        activityType: '',
        description: '',
        hours: '',
        semester: SEMESTERS[0],
      });
      qc.invalidateQueries({ queryKey: ['ffcs-activities'] });
      qc.invalidateQueries({ queryKey: ['ffcs-progress'] });
      qc.invalidateQueries({ queryKey: ['president-ffcs-members'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Submission failed'),
  });

  const activities = Array.isArray(activitiesData)
    ? activitiesData
    : Array.isArray(activitiesData?.activities)
      ? activitiesData.activities
      : [];

  useEffect(() => {
    if (myClubs?.length === 1 && !form.clubId) {
      setForm((current) => ({ ...current, clubId: myClubs[0].club.id }));
    }
  }, [myClubs, form.clubId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.activityType || !form.hours || !form.semester) {
      toast.error('Please fill all required fields');
      return;
    }
    submitMutation.mutate({ ...form, clubId: form.clubId || undefined, hours: parseFloat(form.hours) });
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>
            Student · FFCS
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>FFCS Credit Tracker</h1>
          <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>
            Submit co-curricular activities, track FFCS credits, and monitor your semester progress.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-secondary flex items-center gap-1.5" onClick={handleDownloadReport} disabled={downloadingReport}>
            {downloadingReport ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Download PDF Report
          </button>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> Log Activity
          </button>
        </div>
      </div>

      {/* Progress card */}
      <div className="card p-6">
        {progressLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1,2,3,4].map(i => <SkeletonCard key={i} className="h-20" />)}
          </div>
        ) : progress ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_300px]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="section-title">Semester Progress</div>
                  <div className="section-subtitle">{progress.earnedCredits?.toFixed(1)} of {progress.requiredCredits} credits earned</div>
                </div>
                <span className={`badge ${progress.status === 'COMPLETE' ? 'badge-green' : 'badge-amber'}`}>
                  {progress.status === 'COMPLETE' ? '✓ Complete' : 'In Progress'}
                </span>
              </div>
              <div className="progress-bar mb-1">
                <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${progress.percentComplete}%` }} transition={{ duration: 1 }} />
              </div>
              <div className="text-right text-[12px] font-bold" style={{ color: '#0F172A' }}>{Math.round(progress.percentComplete)}%</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Approved', val: progress.breakdown?.approved ?? 0, color: '#059669', badge: 'badge-green' },
                { label: 'Pending', val: progress.breakdown?.pending ?? 0, color: '#d97706', badge: 'badge-amber' },
                { label: 'Rejected', val: progress.breakdown?.rejected ?? 0, color: '#ef4444', badge: 'badge-red' },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div className="text-2xl font-extrabold" style={{ color: item.color }}>{item.val}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[13px]" style={{ color: '#64748B' }}>No FFCS progress data found.</p>
        )}
      </div>

      {/* Submit form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="section-title">Log New Activity</div>
            <button className="btn-ghost p-2" onClick={() => setShowForm(false)}><XCircle className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="label">Club</label>
              <select className="input" value={form.clubId} onChange={e => setForm({ ...form, clubId: e.target.value })}>
                <option value="">No club / personal activity</option>
                {(myClubs || []).map((membership: any) => <option key={membership.club.id} value={membership.club.id}>{membership.club.name}</option>)}
              </select>
              <div className="mt-1 text-[11px]" style={{ color: '#94a3b8' }}>
                Select your club if you want the president to see this activity in FFCS management.
              </div>
            </div>
            <div>
              <label className="label">Activity Type *</label>
              <select className="input" value={form.activityType} onChange={e => setForm({ ...form, activityType: e.target.value })} required>
                <option value="">Select activity type</option>
                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Semester *</label>
              <select className="input" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}>
                {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Hours Logged *</label>
              <input type="number" className="input" placeholder="e.g. 4" step="0.5" min="0.5"
                value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} required />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={3} placeholder="Briefly describe the activity and your role..."
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2" style={{ borderTop: '1px solid #E2E8F0' }}>
              <button type="submit" className="btn-primary" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : <><Upload className="h-4 w-4" /> Submit Activity</>}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Activity list */}
      <div className="card">
        <div className="p-5 pb-0">
          <div className="section-title">My Activities</div>
          <div className="section-subtitle mt-0.5">All submitted FFCS activities and their approval status</div>
        </div>
        <div className="table-wrapper mt-4 border-0 border-t rounded-none" style={{ borderColor: '#E2E8F0' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Type</th>
                <th>Semester</th>
                <th>Hours</th>
                <th>Credits</th>
                <th>Status</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {activitiesLoading ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j}><div className="skeleton h-5 w-full" /></td>)}</tr>
              )) : activities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12" style={{ color: '#64748B' }}>
                    <BookOpen className="h-8 w-8 mx-auto mb-2" style={{ color: '#94a3b8' }} />
                    <p>No activities logged yet. Click &quot;Log Activity&quot; to get started.</p>
                  </td>
                </tr>
              ) : activities.map((a: any) => {
                const conf = STATUS_CONFIG[a.status] || STATUS_CONFIG.PENDING;
                const Icon = conf.icon;
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="font-semibold text-[13px]" style={{ color: '#0F172A' }}>{a.description || a.activityType}</div>
                      <div className="text-[11px]" style={{ color: '#94a3b8' }}>{formatDate(a.createdAt)}</div>
                    </td>
                    <td><span className="tag">{a.activityType}</span></td>
                    <td className="text-[13px]" style={{ color: '#64748B' }}>{a.semester}</td>
                    <td className="text-[13px] font-semibold" style={{ color: '#0F172A' }}>{a.hours}h</td>
                    <td className="text-[13px] font-semibold" style={{ color: '#1e40af' }}>{a.credits}</td>
                    <td>
                      <span className={`badge ${conf.badge} flex items-center gap-1`}>
                        <Icon className="h-3 w-3" />{a.status}
                      </span>
                    </td>
                    <td className="text-[12px]" style={{ color: '#64748B' }}>{a.facultyNote || a.club?.name || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
