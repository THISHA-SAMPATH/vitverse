'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, XCircle, Search, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { focApi } from '../../../lib/api';

function SkeletonRow() {
  return (
    <tr>{Array.from({ length: 8 }).map((_, i) => <td key={i}><div className="skeleton h-5 w-full" /></td>)}</tr>
  );
}

function ReviewModal({ activity, onClose, onApprove, onReject }: any) {
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<'view' | 'reject'>('view');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-extrabold" style={{ color: '#0F172A' }}>Review FFCS Activity</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 mb-5">
          {[
            { label: 'Student', value: activity.user?.name || '-' },
            { label: 'Reg No.', value: activity.user?.regNumber || '-' },
            { label: 'Activity', value: activity.activityType },
            { label: 'Semester', value: activity.semester },
            { label: 'Hours', value: `${activity.hours}h` },
            { label: 'Credits', value: activity.credits },
          ].map((item) => (
            <div key={item.label} className="flex gap-3 rounded-xl p-3" style={{ background: '#F8FAFC' }}>
              <span className="text-[12px] font-semibold w-20 flex-shrink-0" style={{ color: '#64748B' }}>{item.label}</span>
              <span className="text-[13px]" style={{ color: '#0F172A' }}>{item.value}</span>
            </div>
          ))}
          {activity.description && (
            <div className="rounded-xl p-3" style={{ background: '#F8FAFC' }}>
              <div className="text-[12px] font-semibold mb-1" style={{ color: '#64748B' }}>Description</div>
              <p className="text-[13px]" style={{ color: '#0F172A' }}>{activity.description}</p>
            </div>
          )}
        </div>
        {mode === 'reject' ? (
          <div className="space-y-3">
            <div>
              <label className="label">Rejection Reason *</label>
              <textarea className="input" rows={3} placeholder="Explain the reason for rejection..." value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button className="btn-danger flex-1" onClick={() => note && onReject(note)} disabled={!note}>Confirm Reject</button>
              <button className="btn-secondary" onClick={() => setMode('view')}>Back</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button className="btn-primary flex-1" onClick={onApprove}><CheckCircle className="h-4 w-4" /> Approve</button>
            <button className="btn-danger flex-1" onClick={() => setMode('reject')}><XCircle className="h-4 w-4" /> Reject</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function AdminFFCSPage() {
  const qc = useQueryClient();
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkRejectNote, setBulkRejectNote] = useState('');

  const { data: pendingData, isLoading } = useQuery({
    queryKey: ['admin-ffcs-pending'],
    queryFn: () => focApi.pending().then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => focApi.approve(id).then((r) => r.data),
    onSuccess: () => {
      toast.success('Activity approved');
      setSelectedActivity(null);
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ['admin-ffcs-pending'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => focApi.reject(id, note).then((r) => r.data),
    onSuccess: () => {
      toast.success('Activity rejected');
      setSelectedActivity(null);
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ['admin-ffcs-pending'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (ids: string[]) => focApi.bulkApprove(ids).then((r) => r.data),
    onSuccess: (data: any) => {
      toast.success(`${data.count || 0} activities approved`);
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ['admin-ffcs-pending'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Bulk approval failed'),
  });

  const bulkRejectMutation = useMutation({
    mutationFn: ({ ids, note }: { ids: string[]; note: string }) => focApi.bulkReject(ids, note).then((r) => r.data),
    onSuccess: (data: any) => {
      toast.success(`${data.count || 0} activities rejected`);
      setSelectedIds([]);
      setBulkRejectNote('');
      qc.invalidateQueries({ queryKey: ['admin-ffcs-pending'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Bulk reject failed'),
  });

  const activities = pendingData || [];
  const filtered = activities.filter((activity: any) => {
    const matchSearch = !search
      || activity.user?.name?.toLowerCase().includes(search.toLowerCase())
      || activity.activityType?.toLowerCase().includes(search.toLowerCase())
      || activity.user?.regNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || activity.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingOnly = filtered.filter((activity: any) => activity.status === 'PENDING');

  const counts = {
    PENDING: activities.filter((activity: any) => activity.status === 'PENDING').length,
    APPROVED: activities.filter((activity: any) => activity.status === 'APPROVED').length,
    REJECTED: activities.filter((activity: any) => activity.status === 'REJECTED').length,
  };

  const statusBadge: Record<string, string> = {
    PENDING: 'badge-amber',
    APPROVED: 'badge-green',
    REJECTED: 'badge-red',
    COMPLETED: 'badge-green',
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = pendingOnly.map((activity: any) => activity.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id: string) => selectedIds.includes(id));
    setSelectedIds(allSelected ? selectedIds.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedIds, ...visibleIds])));
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Admin / FFCS</div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>FFCS Approvals</h1>
          <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>
            Review, search, and bulk approve student co-curricular activity submissions for FFCS credits.
          </p>
        </div>
        {counts.PENDING > 0 && <span className="badge badge-amber text-sm px-4 py-2">{counts.PENDING} pending</span>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Review', val: counts.PENDING, color: '#d97706' },
          { label: 'Approved', val: counts.APPROVED, color: '#059669' },
          { label: 'Rejected', val: counts.REJECTED, color: '#ef4444' },
        ].map((item) => (
          <div key={item.label} className="stat-card">
            <div className="text-2xl font-extrabold" style={{ color: item.color }}>{item.val}</div>
            <div className="text-[13px] mt-1" style={{ color: '#64748B' }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 p-5">
          <div className="relative flex-1" style={{ minWidth: 220 }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
            <input className="input pl-9" placeholder="Search by student name, reg no, or activity..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className="px-3 py-2 rounded-lg text-[12px] font-semibold transition-all"
                style={statusFilter === status ? { background: '#0F172A', color: '#fff' } : { background: '#F1F5F9', color: '#64748B' }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-4 flex flex-wrap gap-3 items-center">
          <button className="btn-secondary text-[12px] py-2 px-3" onClick={toggleSelectAllVisible}>
            {pendingOnly.length > 0 && pendingOnly.every((activity: any) => selectedIds.includes(activity.id)) ? 'Clear Visible' : 'Select Visible Pending'}
          </button>
          <button className="btn-primary text-[12px] py-2 px-3" disabled={selectedIds.length === 0 || bulkApproveMutation.isPending} onClick={() => bulkApproveMutation.mutate(selectedIds)}>
            <CheckCircle className="h-3.5 w-3.5" /> Bulk Approve ({selectedIds.length})
          </button>
          <input
            className="input"
            style={{ minWidth: 220 }}
            placeholder="Bulk reject note..."
            value={bulkRejectNote}
            onChange={(e) => setBulkRejectNote(e.target.value)}
          />
          <button
            className="btn-danger text-[12px] py-2 px-3"
            disabled={selectedIds.length === 0 || !bulkRejectNote.trim() || bulkRejectMutation.isPending}
            onClick={() => bulkRejectMutation.mutate({ ids: selectedIds, note: bulkRejectNote.trim() })}
          >
            <XCircle className="h-3.5 w-3.5" /> Bulk Reject ({selectedIds.length})
          </button>
        </div>

        <div className="table-wrapper border-0 border-t rounded-none" style={{ borderColor: '#E2E8F0' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" checked={pendingOnly.length > 0 && pendingOnly.every((activity: any) => selectedIds.includes(activity.id))} onChange={toggleSelectAllVisible} />
                </th>
                <th>Student</th>
                <th>Activity Type</th>
                <th>Semester</th>
                <th>Hours</th>
                <th>Credits</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />) :
                filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <BookOpen className="h-8 w-8 mx-auto mb-2" style={{ color: '#94a3b8' }} />
                      <p className="text-[13px]" style={{ color: '#64748B' }}>No activities found.</p>
                    </td>
                  </tr>
                ) : filtered.map((activity: any) => (
                  <tr key={activity.id}>
                    <td>
                      <input
                        type="checkbox"
                        disabled={activity.status !== 'PENDING'}
                        checked={selectedIds.includes(activity.id)}
                        onChange={() => toggleSelection(activity.id)}
                      />
                    </td>
                    <td>
                      <div className="font-semibold text-[13px]" style={{ color: '#0F172A' }}>{activity.user?.name || '-'}</div>
                      <div className="text-[11px]" style={{ color: '#94a3b8' }}>{activity.user?.regNumber || '-'}</div>
                    </td>
                    <td><span className="tag">{activity.activityType}</span></td>
                    <td className="text-[13px]" style={{ color: '#64748B' }}>{activity.semester}</td>
                    <td className="text-[13px] font-semibold" style={{ color: '#0F172A' }}>{activity.hours}h</td>
                    <td className="text-[13px] font-semibold" style={{ color: '#1e40af' }}>{activity.credits}</td>
                    <td><span className={`badge ${statusBadge[activity.status] || 'badge-slate'}`}>{activity.status}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-ghost text-[11px] py-1.5 px-2" onClick={() => setSelectedActivity(activity)}>
                          <Eye className="h-3.5 w-3.5" /> Review
                        </button>
                        {activity.status === 'PENDING' && (
                          <>
                            <button
                              className="text-[11px] py-1.5 px-2 rounded-lg font-semibold transition-colors"
                              style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}
                              onClick={() => approveMutation.mutate({ id: activity.id })}
                            >
                              Approve
                            </button>
                            <button
                              className="text-[11px] py-1.5 px-2 rounded-lg font-semibold transition-colors"
                              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                              onClick={() => setSelectedActivity(activity)}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedActivity && (
          <ReviewModal
            activity={selectedActivity}
            onClose={() => setSelectedActivity(null)}
            onApprove={() => approveMutation.mutate({ id: selectedActivity.id })}
            onReject={(note: string) => rejectMutation.mutate({ id: selectedActivity.id, note })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
