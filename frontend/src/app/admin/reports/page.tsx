'use client';

import { useState } from 'react';
import { FileText, Download, BarChart3, Users, Calendar, BookOpen, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../../lib/api';

const REPORTS = [
  {
    id: 'events-summary',
    title: 'Events Summary Report',
    description: 'Complete list of all events with registration counts, status, venue, and dates.',
    icon: Calendar,
    color: '#1e40af',
    bg: 'rgba(30,64,175,0.08)',
    format: 'CSV',
  },
  {
    id: 'user-activity',
    title: 'User Activity Report',
    description: 'User registrations, points earned, and engagement metrics.',
    icon: Users,
    color: '#059669',
    bg: 'rgba(5,150,105,0.08)',
    format: 'CSV',
  },
  {
    id: 'ffcs-credits',
    title: 'FFCS Credits Report',
    description: 'All student FFCS activity submissions with approval status and credit totals.',
    icon: BookOpen,
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.08)',
    format: 'CSV',
  },
  {
    id: 'seat-utilization',
    title: 'Seat Utilization Report',
    description: 'Event-wise seat booking rates, cancellation counts, and waitlist sizes.',
    icon: BarChart3,
    color: '#d97706',
    bg: 'rgba(217,119,6,0.08)',
    format: 'CSV',
  },
  {
    id: 'club-health',
    title: 'Club Health Score Report',
    description: 'Club health scores, member counts, events hosted, and engagement analysis.',
    icon: BarChart3,
    color: '#be185d',
    bg: 'rgba(190,24,93,0.08)',
    format: 'CSV',
  },
  {
    id: 'campus-comparison',
    title: 'Campus Comparison Report',
    description: 'Cross-campus comparison of events, users, FFCS credits, and activity levels.',
    icon: BarChart3,
    color: '#0891b2',
    bg: 'rgba(8,145,178,0.08)',
    format: 'CSV',
  },
];

export default function AdminReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [campus, setCampus] = useState('ALL');

  const handleDownload = (reportId: string) => {
    setDownloading(reportId);
    adminApi.report(reportId, {
      campus: campus === 'ALL' ? undefined : campus,
      from: dateRange.from || undefined,
      to: dateRange.to || undefined,
    }).then(({ data }) => {
      const blob = new Blob([data.csv], { type: data.contentType || 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', data.filename || `${reportId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setDownloading(null);
      toast.success('Report downloaded successfully');
    }).catch((error: any) => {
      setDownloading(null);
      toast.error(error?.response?.data?.message || 'Report download failed');
    });
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Admin / Reports</div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>Platform Reports</h1>
        <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>
          Generate and download detailed reports for platform data, events, users, and FFCS credits.
        </p>
      </div>

      <div className="card p-5">
        <div className="section-title mb-3">Report Filters</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Date From</label>
            <input type="date" className="input" value={dateRange.from} onChange={(e) => setDateRange((d) => ({ ...d, from: e.target.value }))} />
          </div>
          <div>
            <label className="label">Date To</label>
            <input type="date" className="input" value={dateRange.to} onChange={(e) => setDateRange((d) => ({ ...d, to: e.target.value }))} />
          </div>
          <div>
            <label className="label">Campus</label>
            <select className="input" value={campus} onChange={(e) => setCampus(e.target.value)}>
              <option value="ALL">All Campuses</option>
              <option value="VELLORE">VIT Vellore</option>
              <option value="CHENNAI">VIT Chennai</option>
              <option value="AP">VIT AP</option>
              <option value="BHOPAL">VIT Bhopal</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          const isDownloading = downloading === report.id;
          return (
            <div key={report.id} className="card p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: report.bg }}>
                  <Icon className="h-5 w-5" style={{ color: report.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[14px]" style={{ color: '#0F172A' }}>{report.title}</div>
                  <span className="badge badge-slate mt-1">{report.format}</span>
                </div>
              </div>
              <p className="text-[13px] leading-relaxed mb-4" style={{ color: '#64748B' }}>
                {report.description}
              </p>
              <button className="btn-primary w-full justify-center text-[13px]" onClick={() => handleDownload(report.id)} disabled={isDownloading}>
                {isDownloading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                  : <><Download className="h-4 w-4" /> Download Report</>}
              </button>
            </div>
          );
        })}
      </div>

      <div className="card p-4 flex items-start gap-3" style={{ background: 'rgba(30,64,175,0.03)', borderColor: 'rgba(30,64,175,0.15)' }}>
        <FileText className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#1e40af' }} />
        <div className="text-[13px]" style={{ color: '#64748B' }}>
          All reports are generated in CSV format. Date range and campus filters apply to all reports.
          Reports include data from all events, users, and activities within the selected filters.
        </div>
      </div>
    </div>
  );
}
