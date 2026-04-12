'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Users, Building2, Sparkles, TrendingUp } from 'lucide-react';
import { leaderboardApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { getCampusLabel, getCampusColor, getInitials, cn } from '../../lib/utils';

const TABS = ['Students', 'Clubs', 'Campuses'] as const;
type Tab = typeof TABS[number];

const CAMPUSES = [
  { value: '', label: 'All Campuses' },
  { value: 'VELLORE', label: 'Vellore' },
  { value: 'CHENNAI', label: 'Chennai' },
  { value: 'AP', label: 'AP' },
  { value: 'BHOPAL', label: 'Bhopal' },
];

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('Students');
  const [campus, setCampus] = useState('');

  const { data: studentData } = useQuery({
    queryKey: ['leaderboard-students', campus],
    queryFn: () => leaderboardApi.students(campus || undefined).then((r) => r.data),
    enabled: tab === 'Students',
  });

  const { data: clubData } = useQuery({
    queryKey: ['leaderboard-clubs', campus],
    queryFn: () => leaderboardApi.clubs(campus || undefined).then((r) => r.data),
    enabled: tab === 'Clubs',
  });

  const { data: campusData } = useQuery({
    queryKey: ['leaderboard-campuses'],
    queryFn: () => leaderboardApi.campuses().then((r) => r.data),
    enabled: tab === 'Campuses',
  });

  const { data: myRank } = useQuery({
    queryKey: ['my-rank'],
    queryFn: () => leaderboardApi.myRank().then((r) => r.data),
    enabled: !!user,
  });

  const podium = studentData?.podium || [];
  const rest = studentData?.rest || [];
  const orderedPodium = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <div className="space-y-6">
      <section className="page-header px-6 py-7 md:px-7 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              Leaderboard Arena
            </div>
            <h1 className="text-4xl font-extrabold tracking-[-0.06em] text-slate-900 md:text-5xl">
              The most active students, clubs, and campuses in one competitive view.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Track momentum across the ecosystem, celebrate top performers, and see where you stand right now.
            </p>
          </div>
          {myRank && (
            <div className="card min-w-[240px] px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Your Position</div>
              <div className="mt-2 text-4xl font-extrabold tracking-[-0.06em] gradient-text">#{myRank.globalRank}</div>
              <div className="mt-1 text-sm text-slate-400">{myRank.points.toLocaleString()} points earned</div>
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="card flex w-fit gap-1 p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all duration-200',
                tab === t ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-[0_16px_34px_rgba(64,92,255,0.28)]' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab !== 'Campuses' && (
          <div className="flex flex-wrap gap-2">
            {CAMPUSES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCampus(c.value)}
                className={cn(
                  'rounded-full border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all',
                  campus === c.value
                    ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'Students' && (
        <div className="space-y-6">
          {orderedPodium.length > 0 && (
            <section className="card p-6 md:p-7">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-200/10 text-amber-200">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-[-0.05em] text-slate-900">Top Podium</h2>
                  <p className="text-sm text-slate-400">The current student leaders across VITVerse</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {orderedPodium.map((entry: any, index: number) => {
                  const rankMap = [2, 1, 3];
                  const rank = rankMap[index];
                  const accent = rank === 1 ? 'from-amber-300/25 to-yellow-100/10 border-amber-300/25' : rank === 2 ? 'from-slate-300/10 to-slate-100/5 border-white/10' : 'from-orange-400/15 to-amber-300/10 border-orange-300/20';
                  const Icon = rank === 1 ? Crown : Medal;
                  return (
                    <motion.div key={entry.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={`rounded-[28px] border bg-gradient-to-b ${accent} p-5 text-center`}>
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-lg font-extrabold text-slate-900">
                        {entry.avatar ? <img src={entry.avatar} alt="" className="h-full w-full rounded-full object-cover" /> : getInitials(entry.name)}
                      </div>
                      <div className="mt-4 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                        <Icon className="h-3.5 w-3.5" /> Rank #{rank}
                      </div>
                      <div className="mt-4 text-xl font-extrabold tracking-[-0.04em] text-slate-900">{entry.name}</div>
                      <div className="mt-1 text-sm text-slate-400">{getCampusLabel(entry.campus)}</div>
                      <div className="mt-4 text-3xl font-extrabold tracking-[-0.06em] gradient-text-gold">{entry.points?.toLocaleString()}</div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">points</div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="card p-6 md:p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400/20 to-cyan-400/20 text-cyan-200">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold tracking-[-0.05em] text-slate-900">Student Rankings</h2>
                <p className="text-sm text-slate-400">Full standings ordered by platform points</p>
              </div>
            </div>
            <div className="space-y-3">
              {rest.map((student: any) => (
                <div key={student.id} className={cn('rounded-[24px] border p-4 md:flex md:items-center md:gap-4', student.id === user?.id ? 'border-cyan-300/25 bg-cyan-300/8' : 'border-white/8 bg-white/[0.03]')}>
                  <div className="text-2xl font-extrabold tracking-[-0.05em] text-slate-500 md:w-16">#{Number(student.rank)}</div>
                  <div className="mt-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-extrabold text-slate-900 md:mt-0">
                    {student.avatar ? <img src={student.avatar} alt="" className="h-full w-full rounded-full object-cover" /> : getInitials(student.name)}
                  </div>
                  <div className="mt-3 min-w-0 flex-1 md:mt-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold text-slate-900">{student.name}</div>
                      {student.id === user?.id && <span className="badge badge-blue">You</span>}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{getCampusLabel(student.campus)} · {student.department}</div>
                  </div>
                  <div className="mt-3 text-right md:mt-0">
                    <div className="text-lg font-extrabold text-amber-300">{student.points?.toLocaleString()}</div>
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-600">points</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'Clubs' && (
        <section className="card p-6 md:p-7">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 text-emerald-200">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-[-0.05em] text-slate-900">Club Standings</h2>
              <p className="text-sm text-slate-400">Which communities are building the most momentum</p>
            </div>
          </div>
          <div className="space-y-3">
            {(clubData || []).map((club: any) => (
              <div key={club.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 md:flex md:items-center md:gap-4">
                <div className="text-2xl font-extrabold tracking-[-0.05em] text-slate-500 md:w-16">#{Number(club.rank)}</div>
                <div className="mt-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 md:mt-0" style={{ background: `${getCampusColor(club.campus)}22` }}>
                  {club.logo ? <img src={club.logo} alt="" className="h-full w-full object-cover" /> : <span className="text-lg font-extrabold text-slate-900">{club.name?.[0]}</span>}
                </div>
                <div className="mt-3 min-w-0 flex-1 md:mt-0">
                  <div className="truncate text-base font-semibold text-slate-900">{club.name}</div>
                  <div className="mt-1 text-sm text-slate-500">{getCampusLabel(club.campus)} · {club.member_count} members · {club.events_hosted || 0} events hosted</div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4 md:mt-0 md:w-[220px]">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-center">
                    <div className="text-lg font-extrabold text-amber-300">{club.points?.toLocaleString()}</div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-600">Points</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-center">
                    <div className="text-lg font-extrabold text-cyan-300">{club.healthScore?.toFixed(0) || 0}</div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-600">Health</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'Campuses' && (
        <section className="card p-6 md:p-7">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400/20 to-indigo-400/20 text-indigo-200">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-[-0.05em] text-slate-900">Campus Race</h2>
              <p className="text-sm text-slate-400">How each campus is performing overall</p>
            </div>
          </div>
          <div className="space-y-4">
            {(campusData || []).map((entry: any) => {
              const color = getCampusColor(entry.campus);
              const leaderTotal = campusData?.[0]?.total_points || 1;
              const percent = Math.max((entry.total_points / leaderTotal) * 100, 8);
              return (
                <div key={entry.campus} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 18px ${color}` }} />
                        <h3 className="text-lg font-bold text-slate-900">{getCampusLabel(entry.campus)}</h3>
                      </div>
                      <div className="mt-1 text-sm text-slate-500">Rank #{Number(entry.rank)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-extrabold tracking-[-0.05em] text-slate-900">{Number(entry.total_points).toLocaleString()}</div>
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-600">total points</div>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      { label: 'Students', value: Number(entry.student_count).toLocaleString() },
                      { label: 'Events', value: Number(entry.events_count).toLocaleString() },
                      { label: 'Momentum', value: `${Math.round(percent)}%` },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div className="text-lg font-extrabold text-slate-900">{item.value}</div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-600">{item.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full" style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${color}, #73E3FF)` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

