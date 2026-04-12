'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, Search
} from 'lucide-react';
import { focApi } from '../../../lib/api';
import { formatDate } from '../../../lib/utils';

const STATUS_CFG: Record<string, any> = {
  APPROVED: { badge: 'badge-green', label: 'Approved' },
  PENDING: { badge: 'badge-amber', label: 'Pending' },
  REJECTED: { badge: 'badge-red', label: 'Rejected' },
  COMPLETED: { badge: 'badge-green', label: 'Completed' },
};

export default function PresidentFFCSPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: pendingData, isLoading } = useQuery({
    queryKey: ['president-ffcs-members'],
    queryFn: () => focApi.clubActivities().then((r) => r.data),
  });

  const activities = pendingData || [];
  const filtered = activities.filter((a: any) => {
    const matchSearch = !search || a.user?.name?.toLowerCase().includes(search.toLowerCase()) || a.activityType?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: activities.length,
    pending: activities.filter((a: any) => a.status === 'PENDING').length,
    approved: activities.filter((a: any) => a.status === 'APPROVED').length,
    totalHours: activities.reduce((s: number, a: any) => s + (a.hours || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>President | FFCS</div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>FFCS Management</h1>
          <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>
            Monitor your club members&apos; FFCS activity submissions and track overall credit progress.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: 'Total Submissions', val: counts.total, color: '#1e40af', bg: 'rgba(30,64,175,0.08)' },
          { label: 'Pending Review', val: counts.pending, color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
          { label: 'Approved', val: counts.approved, color: '#059669', bg: 'rgba(5,150,105,0.08)' },
          { label: 'Total Hours', val: `${counts.totalHours}h`, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
        ].map(item => (
          <div key={item.label} className="stat-card">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg mb-3" style={{ background: item.bg }}>
              <BookOpen className="h-4 w-4" style={{ color: item.color }} />
            </div>
            <div className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>{item.val}</div>
            <div className="text-[13px] mt-1" style={{ color: '#64748B' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
          <input className="input pl-9" placeholder="Search member or activity..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-2 rounded-lg text-[12px] font-semibold transition-all"
              style={statusFilter === s ? { background: '#0F172A', color: '#fff' } : { background: '#F1F5F9', color: '#64748B' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper border-0 rounded-none">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Activity Type</th>
                <th>Description</th>
                <th>Semester</th>
                <th>Hours</th>
                <th>Credits</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j}><div className="skeleton h-5 w-full" /></td>)}</tr>
              )) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <BookOpen className="h-8 w-8 mx-auto mb-2" style={{ color: '#94a3b8' }} />
                    <p className="text-[13px]" style={{ color: '#64748B' }}>No FFCS activities found for your club members.</p>
                  </td>
                </tr>
              ) : filtered.map((a: any) => (
                <tr key={a.id}>
                  <td>
                    <div className="font-semibold text-[13px]" style={{ color: '#0F172A' }}>{a.user?.name || '—'}</div>
                    <div className="text-[11px]" style={{ color: '#94a3b8' }}>{a.user?.regNumber || '—'}</div>
                  </td>
                  <td><span className="tag">{a.activityType}</span></td>
                  <td className="text-[13px] max-w-[160px] truncate" style={{ color: '#64748B' }}>{a.description || '—'}</td>
                  <td className="text-[13px]" style={{ color: '#64748B' }}>{a.semester}</td>
                  <td className="text-[13px] font-semibold" style={{ color: '#0F172A' }}>{a.hours}h</td>
                  <td className="text-[13px] font-semibold" style={{ color: '#1e40af' }}>{a.credits}</td>
                  <td><span className={`badge ${STATUS_CFG[a.status]?.badge || 'badge-slate'}`}>{STATUS_CFG[a.status]?.label || a.status}</span></td>
                  <td className="text-[12px]" style={{ color: '#94a3b8' }}>{formatDate(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info note */}
      <div className="card p-4 flex items-start gap-3" style={{ background: 'rgba(30,64,175,0.03)', borderColor: 'rgba(30,64,175,0.15)' }}>
        <BookOpen className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#1e40af' }} />
        <div className="text-[13px]" style={{ color: '#64748B' }}>
          As a Club President, you can view your club members&apos; FFCS activity submissions.
          Final approval is done by faculty/admin. Encourage members to keep their activity logs up to date.
        </div>
      </div>
    </div>
  );
}
