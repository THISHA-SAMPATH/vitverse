'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, Calendar, Shield, Activity,
  CheckCircle, Clock, ChevronRight,
  BookOpen, BarChart3, Bell, FileText,
} from 'lucide-react';
import Link from 'next/link';
import { adminApi, eventsApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { formatDate } from '../../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const CAMPUS_COLORS = ['#1e40af', '#059669', '#7c3aed', '#d97706'];

function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user && !['SUPER_ADMIN', 'FACULTY'].includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const { data: overview, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.overview().then((r) => r.data),
    refetchInterval: 60000,
  });

  const { data: pendingEvents, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-events'],
    queryFn: () => eventsApi.list({ status: 'DRAFT', limit: 5, includeAll: true }).then((r) => r.data),
  });

  const campusPieData = overview?.campusBreakdown?.map((campus: any, index: number) => ({
    name: { VELLORE: 'Vellore', CHENNAI: 'Chennai', AP: 'AP', BHOPAL: 'Bhopal' }[campus.campus as string] || campus.campus,
    value: campus._count,
    color: CAMPUS_COLORS[index % CAMPUS_COLORS.length],
  })) || [];

  const monthlyData = overview?.monthlyStats || [];

  const statsCards = [
    { icon: Users, label: 'Total Users', value: overview?.totalUsers ?? 0, color: '#1e40af', bg: 'rgba(30,64,175,0.08)', link: '/admin/users' },
    { icon: Calendar, label: 'Total Events', value: overview?.totalEvents ?? 0, color: '#059669', bg: 'rgba(5,150,105,0.08)', link: '/admin/events' },
    { icon: Clock, label: 'Pending Approval', value: overview?.pendingEvents ?? pendingEvents?.data?.length ?? 0, color: '#d97706', bg: 'rgba(217,119,6,0.08)', link: '/admin/events' },
    { icon: BookOpen, label: 'FFCS Pending', value: overview?.pendingFoc ?? 0, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', link: '/admin/ffcs' },
  ];

  const adminActions = [
    { href: '/admin/events', icon: Calendar, label: 'Approve / Reject Events', color: '#d97706', badge: overview?.pendingEvents || 0 },
    { href: '/admin/ffcs', icon: BookOpen, label: 'Review FFCS Submissions', color: '#7c3aed', badge: overview?.pendingFoc || 0 },
    { href: '/admin/users', icon: Users, label: 'Manage Users', color: '#1e40af', badge: null },
    { href: '/admin/clubs', icon: Activity, label: 'Monitor Club Health', color: '#0891b2', badge: null },
    { href: '/admin/analytics', icon: BarChart3, label: 'View Analytics', color: '#059669', badge: null },
    { href: '/admin/announcements', icon: Bell, label: 'Post Announcement', color: '#be185d', badge: null },
    { href: '/admin/reports', icon: FileText, label: 'Download Reports', color: '#334155', badge: null },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>
            Admin / Overview
          </div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2" style={{ color: '#0F172A' }}>
            <Shield className="h-6 w-6" style={{ color: '#1e40af' }} />
            Admin Dashboard
          </h1>
          <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>
            Platform-wide overview for events, users, FFCS approvals, analytics, and reporting.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/events"><button className="btn-primary"><CheckCircle className="h-4 w-4" /> Review Events</button></Link>
          <Link href="/admin/reports"><button className="btn-secondary"><FileText className="h-4 w-4" /> Reports</button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {statsCards.map((card) => (
          <Link key={card.label} href={card.link}>
            <div className="stat-card cursor-pointer group">
              {isLoading ? <SkeletonCard className="h-20 w-full" /> : (
                <>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg mb-3 transition-transform group-hover:scale-110" style={{ background: card.bg }}>
                    <card.icon className="h-4 w-4" style={{ color: card.color }} />
                  </div>
                  <div className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>{Number(card.value).toLocaleString()}</div>
                  <div className="text-[13px] mt-1" style={{ color: '#64748B' }}>{card.label}</div>
                </>
              )}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="section-title">Platform Activity</div>
                <div className="section-subtitle">Events and registrations over the last 6 months</div>
              </div>
            </div>
            {isLoading ? <SkeletonCard className="h-56 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13 }} />
                  <Bar dataKey="events" fill="#1e40af" radius={[6, 6, 0, 0]} name="Events" />
                  <Bar dataKey="registrations" fill="#93c5fd" radius={[6, 6, 0, 0]} name="Registrations" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="section-title">Pending Event Approvals</div>
                <div className="section-subtitle">Events submitted by club presidents awaiting review</div>
              </div>
              <Link href="/admin/events">
                <button className="btn-secondary text-[12px] py-2 px-3">View All <ChevronRight className="h-3.5 w-3.5" /></button>
              </Link>
            </div>
            {pendingLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <SkeletonCard key={i} className="h-20" />)}</div>
            ) : pendingEvents?.data?.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" style={{ color: '#059669' }} />
                <p className="text-[13px]" style={{ color: '#64748B' }}>All caught up. No pending events.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingEvents?.data?.slice(0, 5).map((event: any) => (
                  <div key={event.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(217,119,6,0.08)' }}>
                      <Calendar className="h-4 w-4" style={{ color: '#d97706' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[13px] truncate" style={{ color: '#0F172A' }}>{event.title}</div>
                      <div className="text-[12px] mt-0.5" style={{ color: '#64748B' }}>
                        {event.club?.name || 'Unknown Club'} | {event.startDateTime ? formatDate(event.startDateTime) : 'No date'}
                      </div>
                    </div>
                    <Link href="/admin/events">
                      <button className="btn-secondary text-[11px] py-1.5 px-3 flex-shrink-0">Review</button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="section-title mb-4">Campus Distribution</div>
            {isLoading ? <SkeletonCard className="h-48 w-full" /> : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={campusPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                      {campusPieData.map((entry: any, index: number) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {campusPieData.map((item: any) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-[12px]" style={{ color: '#64748B' }}>{item.name}: <strong style={{ color: '#0F172A' }}>{item.value}</strong></span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="card p-5">
            <div className="section-title mb-3">Admin Actions</div>
            <div className="space-y-2">
              {adminActions.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-colors hover:bg-slate-50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${item.color}12` }}>
                      <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                    </div>
                    <span className="flex-1 text-[13px] font-medium" style={{ color: '#0F172A' }}>{item.label}</span>
                    {item.badge !== null && item.badge > 0 && <span className="badge badge-amber">{item.badge}</span>}
                    <ChevronRight className="h-3.5 w-3.5" style={{ color: '#94a3b8' }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="section-title mb-3">System Health</div>
            <div className="space-y-3">
              {[
                { label: 'Active Events', value: overview?.activeEvents ?? 0, max: overview?.totalEvents || 1, color: '#059669' },
                { label: 'Seat Utilization', value: overview?.avgSeatUtilization ?? 0, max: 100, color: '#1e40af', isPercent: true },
                { label: 'FFCS Completion', value: overview?.ffcsCompletion ?? 0, max: 100, color: '#7c3aed', isPercent: true },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span style={{ color: '#64748B' }}>{item.label}</span>
                    <span className="font-semibold" style={{ color: '#0F172A' }}>
                      {item.isPercent ? `${item.value}%` : item.value}
                    </span>
                  </div>
                  <div className="progress-bar h-1.5">
                    <motion.div
                      className="progress-fill h-full rounded-full"
                      style={{ background: item.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.value / item.max) * 100}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
