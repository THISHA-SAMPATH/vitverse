'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Calendar, Users, Upload, MessageSquare, CalendarClock,
  ClipboardList, TrendingUp, CheckCircle, Clock, AlertCircle,
  ChevronRight, Plus, BarChart3, Award, Bell
} from 'lucide-react';
import Link from 'next/link';
import { clubsApi, eventsApi, adminApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { timeFromNow, formatDate } from '../../lib/utils';

function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export default function PresidentDashboard() {
  const { user } = useAuthStore();

  const { data: clubData, isLoading: clubLoading } = useQuery({
    queryKey: ['president-dashboard'],
    queryFn: () => clubsApi.presidentDashboard().then((r) => r.data),
  });

  const { data: myEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => eventsApi.list({ createdBy: user?.id, includeAll: true }).then((r) => r.data),
    enabled: !!user?.id,
  });

  const { data: announcements } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => adminApi.announcements().then((r) => r.data),
  });

  const club = clubData?.club;
  const pendingEvents = myEvents?.data?.filter((e: any) => e.status === 'DRAFT') || [];
  const approvedEvents = myEvents?.data?.filter((e: any) => e.status === 'PUBLISHED' || e.status === 'LIVE') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>
            Club President Dashboard
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>
            {club ? club.name : 'President Portal'}
          </h1>
          <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>
            Manage your club, submit events for approval, and coordinate FFCS activities.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/president/events">
            <button className="btn-primary"><Upload className="h-4 w-4" /> Submit Event</button>
          </Link>
          <Link href="/president/meetings">
            <button className="btn-secondary"><CalendarClock className="h-4 w-4" /> Schedule Meeting</button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {clubLoading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card"><SkeletonCard className="h-24 w-full" /></div>
        )) : (
          <>
            <div className="stat-card">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg mb-3" style={{ background: 'rgba(37,99,235,0.1)' }}>
                <Users className="h-4 w-4" style={{ color: '#2563eb' }} />
              </div>
              <div className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>{club?._count?.members || 0}</div>
              <div className="text-[13px] mt-1" style={{ color: '#64748B' }}>Club Members</div>
            </div>
            <div className="stat-card">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg mb-3" style={{ background: 'rgba(5,150,105,0.1)' }}>
                <Calendar className="h-4 w-4" style={{ color: '#059669' }} />
              </div>
              <div className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>{approvedEvents.length}</div>
              <div className="text-[13px] mt-1" style={{ color: '#64748B' }}>Live Events</div>
            </div>
            <div className="stat-card">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg mb-3" style={{ background: 'rgba(217,119,6,0.1)' }}>
                <Clock className="h-4 w-4" style={{ color: '#d97706' }} />
              </div>
              <div className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>{pendingEvents.length}</div>
              <div className="text-[13px] mt-1" style={{ color: '#64748B' }}>Pending Approval</div>
            </div>
            <div className="stat-card">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg mb-3" style={{ background: 'rgba(124,58,237,0.1)' }}>
                <BarChart3 className="h-4 w-4" style={{ color: '#7c3aed' }} />
              </div>
              <div className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>{club?.healthScore || 0}%</div>
              <div className="text-[13px] mt-1" style={{ color: '#64748B' }}>Club Health</div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">

          {/* Quick actions */}
          <div className="card p-5">
            <div className="section-title mb-4">Quick Actions</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { href: '/president/events', icon: Upload, label: 'Submit Event', color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
                { href: '/president/ffcs', icon: ClipboardList, label: 'Manage FFCS', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
                { href: '/president/members', icon: Users, label: 'Member Tasks', color: '#059669', bg: 'rgba(5,150,105,0.08)' },
                { href: '/president/discussions', icon: MessageSquare, label: 'Discussions', color: '#0891b2', bg: 'rgba(8,145,178,0.08)' },
                { href: '/president/meetings', icon: CalendarClock, label: 'Schedule Meet', color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
                { href: '/president/registrations', icon: ClipboardList, label: 'Registrations', color: '#be185d', bg: 'rgba(190,24,93,0.08)' },
              ].map(item => (
                <Link key={item.href} href={item.href}>
                  <div className="card-hover flex flex-col items-center gap-2 p-4 text-center cursor-pointer rounded-xl">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: item.bg }}>
                      <item.icon className="h-4.5 w-4.5" style={{ color: item.color }} />
                    </div>
                    <span className="text-[12.5px] font-semibold" style={{ color: '#0F172A' }}>{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Pending events */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="section-title">Submitted Events</div>
                <div className="section-subtitle">Events awaiting admin approval</div>
              </div>
              <Link href="/president/events">
                <button className="btn-primary text-[12px] py-2 px-3"><Plus className="h-3.5 w-3.5" /> New Event</button>
              </Link>
            </div>
            {eventsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} className="h-20" />)}</div>
            ) : myEvents?.data?.length === 0 ? (
              <div className="text-center py-8">
                <Upload className="h-8 w-8 mx-auto mb-2" style={{ color: '#94a3b8' }} />
                <p className="text-[13px]" style={{ color: '#64748B' }}>No events submitted yet.</p>
                <Link href="/president/events">
                  <button className="btn-primary mt-3 text-[12px] py-2">Submit your first event</button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myEvents?.data?.slice(0, 5).map((event: any) => (
                  <div key={event.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: 'rgba(37,99,235,0.08)' }}>
                      <Calendar className="h-4 w-4" style={{ color: '#2563eb' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[13px] truncate" style={{ color: '#0F172A' }}>{event.title}</div>
                      <div className="text-[12px] mt-0.5" style={{ color: '#64748B' }}>
                        {event.startDateTime ? formatDate(event.startDateTime) : 'Date TBA'}
                        {event.venue && <span className="ml-2">· {event.venue}</span>}
                      </div>
                    </div>
                    <span className={`badge ${
                      event.status === 'PUBLISHED' || event.status === 'LIVE' ? 'badge-green' :
                      event.status === 'DRAFT' ? 'badge-amber' :
                      event.status === 'CANCELLED' ? 'badge-red' : 'badge-slate'
                    }`}>{event.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Club info */}
          {club && (
            <div className="card p-5">
              <div className="section-title mb-3">Club Overview</div>
              <div className="flex items-center gap-3 mb-4">
                {club.logo ? (
                  <img src={club.logo} alt={club.name} className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center text-lg font-extrabold text-white"
                    style={{ background: 'linear-gradient(135deg, #0F172A, #1e40af)' }}>
                    {club.name?.[0]}
                  </div>
                )}
                <div>
                  <div className="font-bold text-[14px]" style={{ color: '#0F172A' }}>{club.name}</div>
                  <div className="text-[12px]" style={{ color: '#64748B' }}>{club.category} · {club.campus}</div>
                </div>
              </div>
              <div className="divider" />
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ background: '#F8FAFC' }}>
                  <div className="text-xl font-extrabold" style={{ color: '#0F172A' }}>{club._count?.members || 0}</div>
                  <div className="text-[11px]" style={{ color: '#64748B' }}>Members</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: '#F8FAFC' }}>
                  <div className="text-xl font-extrabold" style={{ color: '#0F172A' }}>{club._count?.events || 0}</div>
                  <div className="text-[11px]" style={{ color: '#64748B' }}>Events Hosted</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[12px] mb-1">
                  <span style={{ color: '#64748B' }}>Health Score</span>
                  <span className="font-bold" style={{ color: '#0F172A' }}>{club.healthScore}%</span>
                </div>
                <div className="progress-bar">
                  <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${club.healthScore}%` }} transition={{ duration: 1 }} />
                </div>
              </div>
            </div>
          )}

          {/* Announcements */}
          {announcements && announcements.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4" style={{ color: '#64748B' }} />
                <div className="section-title">Admin Updates</div>
              </div>
              <div className="space-y-3">
                {announcements.slice(0, 3).map((a: any) => (
                  <div key={a.id} className="rounded-xl p-3"
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div className="font-semibold text-[12.5px]" style={{ color: '#0F172A' }}>{a.title}</div>
                    <div className="text-[11px] mt-1 line-clamp-2" style={{ color: '#64748B' }}>{a.content}</div>
                    <div className="text-[11px] mt-1.5" style={{ color: '#94a3b8' }}>{timeFromNow(a.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="card p-4" style={{ background: 'linear-gradient(135deg, rgba(30,64,175,0.05), rgba(124,58,237,0.05))' }}>
            <div className="text-[12px] font-bold mb-2" style={{ color: '#1e40af' }}>💡 President Tips</div>
            <ul className="space-y-1.5">
              {[
                'Submit events at least 5 days before for timely approval',
                'Keep FFCS records updated every week',
                'Schedule team meetings regularly to stay coordinated',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: '#64748B' }}>
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
