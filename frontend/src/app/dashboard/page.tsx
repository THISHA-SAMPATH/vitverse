'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Calendar, Users, Trophy, Zap, Activity, Clock,
  MapPin, ChevronRight, Flame, ArrowUpRight, BookOpen, Ticket, Star,
  TrendingUp, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { eventsApi, leaderboardApi, focApi, adminApi, bookingsApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { getCampusLabel, formatPoints, timeFromNow, formatDate } from '../../lib/utils';
import { EventCard } from '../../components/events/EventCard';

function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

function StatCard({ icon: Icon, label, value, color, loading }: any) {
  return (
    <div className="stat-card">
      {loading ? (
        <>
          <SkeletonCard className="h-9 w-9 rounded-lg mb-3" />
          <SkeletonCard className="h-7 w-20 mb-1" />
          <SkeletonCard className="h-4 w-28" />
        </>
      ) : (
        <>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg mb-3"
            style={{ background: `${color}15` }}>
            <Icon className="h-4.5 w-4.5" style={{ color }} />
          </div>
          <div className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>{value}</div>
          <div className="text-[13px] mt-1" style={{ color: '#64748B' }}>{label}</div>
        </>
      )}
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuthStore();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['event-stats'],
    queryFn: () => eventsApi.stats().then((r) => r.data),
  });

  const { data: trending, isLoading: trendingLoading } = useQuery({
    queryKey: ['trending-events'],
    queryFn: () => eventsApi.trending().then((r) => r.data),
  });

  const { data: live } = useQuery({
    queryKey: ['live-events'],
    queryFn: () => eventsApi.live().then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: myRank, isLoading: rankLoading } = useQuery({
    queryKey: ['my-rank'],
    queryFn: () => leaderboardApi.myRank().then((r) => r.data),
    enabled: !!user,
  });

  const { data: ffcsProgress, isLoading: ffcsLoading } = useQuery({
    queryKey: ['ffcs-progress'],
    queryFn: () => focApi.progress().then((r) => r.data),
    enabled: user?.role === 'STUDENT',
  });

  const { data: myBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => bookingsApi.my().then((r) => r.data),
    enabled: !!user,
  });

  const { data: announcements } = useQuery({
    queryKey: ['announcements', user?.campus],
    queryFn: () => adminApi.announcements(user?.campus).then((r) => r.data),
  });

  const upcomingBookings = myBookings?.filter((b: any) =>
    b.status === 'CONFIRMED' && new Date(b.event?.startDateTime) > new Date()
  )?.slice(0, 3) || [];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>
            {user?.campus ? getCampusLabel(user.campus) : 'All Campuses'} · Student Dashboard
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>
            Welcome back, {user?.name?.split(' ')[0] || 'Student'} 👋
          </h1>
          <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>
            Track your events, FFCS credits, and campus activity in one place.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/events">
            <button className="btn-primary"><Calendar className="h-4 w-4" /> Browse Events</button>
          </Link>
          <Link href="/student/tasks">
            <button className="btn-secondary"><CheckCircle2 className="h-4 w-4" /> Club Tasks</button>
          </Link>
          <Link href="/bookings">
            <button className="btn-secondary"><Ticket className="h-4 w-4" /> My Bookings</button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={Calendar} label="Total Events" value={stats?.totalEvents ?? 0} color="#2563eb" loading={statsLoading} />
        <StatCard icon={Users} label="Registrations" value={stats?.totalRegistrations ?? 0} color="#059669" loading={statsLoading} />
        <StatCard icon={Activity} label="Live Now" value={stats?.liveCount ?? 0} color="#ef4444" loading={statsLoading} />
        <StatCard icon={Trophy} label="Your Points" value={formatPoints(user?.points ?? 0)} color="#d97706" loading={statsLoading} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">

          {/* Live Events */}
          {live && live.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="live-dot" />
                <div className="section-title">Live Right Now</div>
              </div>
              <div className="space-y-3">
                {live.slice(0, 3).map((event: any) => (
                  <Link key={event.id} href={`/events/${event.slug}`}>
                    <div className="card-hover flex items-center gap-4 p-4 cursor-pointer">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: 'rgba(239,68,68,0.08)' }}>
                        <Flame className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate" style={{ color: '#0F172A' }}>{event.title}</div>
                        <div className="flex items-center gap-3 text-[12px] mt-1" style={{ color: '#64748B' }}>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.venue || 'TBA'}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event._count?.attendances || 0}</span>
                        </div>
                      </div>
                      <span className="badge badge-red">Live</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Trending Events */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="section-title">Trending Events</div>
                <div className="section-subtitle">Most popular this week</div>
              </div>
              <Link href="/events" className="flex items-center gap-1 text-[13px] font-semibold" style={{ color: '#2563eb' }}>
                View all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {trendingLoading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-24" />)
                : trending?.slice(0, 5).map((event: any) => (
                  <EventCard key={event.id} event={event} compact />
                ))
              }
            </div>
          </div>

          {/* Upcoming Bookings */}
          {(upcomingBookings.length > 0 || bookingsLoading) && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="section-title">Upcoming Bookings</div>
                  <div className="section-subtitle">Events you are registered for</div>
                </div>
                <Link href="/bookings" className="flex items-center gap-1 text-[13px] font-semibold" style={{ color: '#2563eb' }}>
                  All bookings <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {bookingsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <SkeletonCard key={i} className="h-20" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingBookings.map((b: any) => (
                    <div key={b.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: 'rgba(37,99,235,0.08)' }}>
                        <Calendar className="h-4 w-4" style={{ color: '#2563eb' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate" style={{ color: '#0F172A' }}>{b.event?.title}</div>
                        <div className="text-[12px]" style={{ color: '#64748B' }}>
                          {b.event?.startDateTime ? formatDate(b.event.startDateTime) : 'Date TBA'}
                          {b.seat && <span className="ml-2">· Seat {b.seat.seatNumber}</span>}
                        </div>
                      </div>
                      <span className="badge badge-green">Confirmed</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Rank */}
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: 'rgba(217,119,6,0.1)' }}>
                <Trophy className="h-4 w-4" style={{ color: '#d97706' }} />
              </div>
              <div className="section-title">Your Ranking</div>
            </div>
            {rankLoading ? (
              <div className="space-y-3">
                <SkeletonCard className="h-12" />
                <SkeletonCard className="h-12" />
              </div>
            ) : myRank ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3 text-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>#{myRank.globalRank}</div>
                    <div className="text-[11px] mt-1" style={{ color: '#64748B' }}>Global Rank</div>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div className="text-2xl font-extrabold" style={{ color: '#d97706' }}>{myRank.points?.toLocaleString()}</div>
                    <div className="text-[11px] mt-1" style={{ color: '#64748B' }}>Points</div>
                  </div>
                </div>
                <Link href="/leaderboard">
                  <button className="btn-secondary w-full justify-center mt-3">View Leaderboard</button>
                </Link>
              </>
            ) : (
              <p className="text-[13px]" style={{ color: '#64748B' }}>No ranking data yet.</p>
            )}
          </div>

          {/* FFCS Progress */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ background: 'rgba(124,58,237,0.1)' }}>
                  <BookOpen className="h-4 w-4" style={{ color: '#7c3aed' }} />
                </div>
                <div className="section-title">FFCS Credits</div>
              </div>
            </div>
            {ffcsLoading ? (
              <div className="space-y-3">
                <SkeletonCard className="h-8 w-full" />
                <SkeletonCard className="h-5 w-full rounded-full" />
                <SkeletonCard className="h-16" />
              </div>
            ) : ffcsProgress ? (
              <>
                <div className="flex justify-between text-[13px] mb-2">
                  <span style={{ color: '#64748B' }}>{ffcsProgress.earnedCredits?.toFixed(1)} / {ffcsProgress.requiredCredits} credits</span>
                  <span className="font-bold" style={{ color: '#0F172A' }}>{Math.round(ffcsProgress.percentComplete)}%</span>
                </div>
                <div className="progress-bar">
                  <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${ffcsProgress.percentComplete}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[
                    { label: 'Approved', val: ffcsProgress.breakdown?.approved ?? 0, color: '#059669' },
                    { label: 'Pending', val: ffcsProgress.breakdown?.pending ?? 0, color: '#d97706' },
                    { label: 'Rejected', val: ffcsProgress.breakdown?.rejected ?? 0, color: '#ef4444' },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg p-2.5 text-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div className="text-xl font-extrabold" style={{ color: item.color }}>{item.val}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <Link href="/ffcs">
                  <button className="btn-secondary w-full justify-center mt-3">Manage FFCS</button>
                </Link>
              </>
            ) : (
              <p className="text-[13px]" style={{ color: '#64748B' }}>No FFCS data found.</p>
            )}
          </div>

          {/* Announcements */}
          {announcements && announcements.length > 0 && (
            <div className="card p-5">
              <div className="section-title mb-3">Announcements</div>
              <div className="space-y-3">
                {announcements.slice(0, 3).map((a: any) => (
                  <div key={a.id} className="rounded-xl p-3"
                    style={{ background: a.pinned ? 'rgba(217,119,6,0.06)' : '#F8FAFC', border: `1px solid ${a.pinned ? 'rgba(217,119,6,0.2)' : '#E2E8F0'}` }}>
                    {a.pinned && <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Pinned</div>}
                    <div className="font-semibold text-[13px]" style={{ color: '#0F172A' }}>{a.title}</div>
                    <div className="text-[12px] mt-1 leading-relaxed" style={{ color: '#64748B' }}>{a.content}</div>
                    <div className="text-[11px] mt-2" style={{ color: '#94a3b8' }}>{timeFromNow(a.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
