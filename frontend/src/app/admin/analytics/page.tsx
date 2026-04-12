'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../../lib/api';
import { getCampusColor, getCampusLabel } from '../../../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export default function AdminAnalyticsPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.overview().then((r) => r.data),
  });

  const monthlyData = overview?.monthlyStats || [];
  const categoryData = (overview?.categoryBreakdown || []).map((item: any) => ({
    ...item,
    color: getCampusColor(item.name?.toUpperCase?.() || item.name || 'VELLORE'),
  }));
  const campusData = (overview?.campusBreakdown || []).map((item: any) => ({
    campus: getCampusLabel(item.campus),
    users: item._count || 0,
    color: getCampusColor(item.campus),
  }));
  const maxCampusUsers = Math.max(...campusData.map((item: any) => item.users), 1);

  const summaryCards = [
    { label: 'Total Users', value: overview?.totalUsers ?? 0, color: '#1e40af' },
    { label: 'Total Events', value: overview?.totalEvents ?? 0, color: '#059669' },
    { label: 'Registrations', value: overview?.totalRegistrations ?? 0, color: '#7c3aed' },
    { label: 'Pending FFCS', value: overview?.pendingFoc ?? 0, color: '#d97706' },
    { label: 'Active Events', value: overview?.activeEvents ?? 0, color: '#dc2626' },
    { label: 'Active Clubs', value: overview?.totalClubs ?? 0, color: '#0891b2' },
    { label: 'Seat Utilization', value: `${overview?.avgSeatUtilization ?? 0}%`, color: '#0f766e' },
    { label: 'FFCS Completion', value: `${overview?.ffcsCompletion ?? 0}%`, color: '#9333ea' },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Admin / Analytics</div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>Platform Analytics</h1>
        <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>
          Live platform trends for usage, registrations, category mix, and campus distribution.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="stat-card">
            {isLoading ? <SkeletonCard className="h-20 w-full" /> : (
              <>
                <div className="text-2xl font-extrabold" style={{ color: card.color }}>
                  {Number(card.value).toLocaleString()}
                </div>
                <div className="text-[13px] mt-1" style={{ color: '#64748B' }}>{card.label}</div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <div className="section-title mb-1">Monthly Activity Trend</div>
          <div className="section-subtitle mb-4">Users, events, and registrations for the last 6 months</div>
          {isLoading ? <SkeletonCard className="h-56 w-full" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gradEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e40af" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13 }} />
                <Area type="monotone" dataKey="registrations" stroke="#1e40af" fill="url(#gradEvents)" strokeWidth={2} name="Registrations" />
                <Area type="monotone" dataKey="users" stroke="#059669" fill="url(#gradUsers)" strokeWidth={2} name="Users" />
                <Bar dataKey="events" fill="#7c3aed" radius={[6, 6, 0, 0]} name="Events" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <div className="section-title mb-1">Event Categories</div>
          <div className="section-subtitle mb-4">Distribution of events by category</div>
          {isLoading ? <SkeletonCard className="h-56 w-full" /> : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {categoryData.map((entry: any, index: number) => (
                      <Cell key={index} fill={entry.color || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryData.length === 0 && (
                  <div className="text-[13px]" style={{ color: '#64748B' }}>No category data yet.</div>
                )}
                {categoryData.map((item: any) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: item.color || '#94a3b8' }} />
                      <span className="text-[13px]" style={{ color: '#64748B' }}>{item.name}</span>
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: '#0F172A' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="section-title mb-1">New User Registrations</div>
          <div className="section-subtitle mb-4">Platform growth over the last 6 months</div>
          {isLoading ? <SkeletonCard className="h-48 w-full" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13 }} />
                <Bar dataKey="users" fill="#7c3aed" radius={[6, 6, 0, 0]} name="New Users" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <div className="section-title mb-4">Campus Comparison</div>
          {isLoading ? <SkeletonCard className="h-48 w-full" /> : (
            <div className="space-y-4">
              {campusData.map((item: any) => (
                <div key={item.campus}>
                  <div className="flex justify-between text-[13px] mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="font-medium" style={{ color: '#0F172A' }}>{item.campus}</span>
                    </div>
                    <span className="font-semibold" style={{ color: '#64748B' }}>{item.users} users</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(item.users / maxCampusUsers) * 100}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="section-title mb-1">Top Performing Clubs</div>
          <div className="section-subtitle mb-4">Highest point clubs on the platform</div>
          {isLoading ? <SkeletonCard className="h-48 w-full" /> : (
            <div className="space-y-3">
              {(overview?.topClubs || []).length === 0 && (
                <div className="text-[13px]" style={{ color: '#64748B' }}>No club performance data yet.</div>
              )}
              {(overview?.topClubs || []).map((club: any, index: number) => (
                <div key={club.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl text-[12px] font-extrabold text-white" style={{ background: 'linear-gradient(135deg, #0F172A, #1e40af)' }}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold" style={{ color: '#0F172A' }}>{club.name}</div>
                    <div className="text-[12px]" style={{ color: '#64748B' }}>{club.campus} • {club.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-bold" style={{ color: '#0F172A' }}>{club.points}</div>
                    <div className="text-[11px]" style={{ color: '#64748B' }}>points</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="section-title mb-1">Risk Signals</div>
          <div className="section-subtitle mb-4">Accounts that need manual review</div>
          {isLoading ? <SkeletonCard className="h-48 w-full" /> : (
            <div className="space-y-3">
              {(overview?.fraudAlerts || []).length === 0 && (
                <div className="text-[13px]" style={{ color: '#64748B' }}>No active risk signals detected.</div>
              )}
              {(overview?.fraudAlerts || []).slice(0, 5).map((alert: any) => (
                <div key={alert.userId} className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.14)' }}>
                  <div className="text-[13px] font-semibold" style={{ color: '#0F172A' }}>{alert.name}</div>
                  <div className="mt-1 text-[12px]" style={{ color: '#64748B' }}>{alert.email}</div>
                  <div className="mt-2 text-[12px]" style={{ color: '#b91c1c' }}>{alert.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
