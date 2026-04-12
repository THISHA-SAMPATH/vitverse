'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Trophy, Star, Calendar, Users, Award, Download,
  Share2, Edit3, ExternalLink, Zap, TrendingUp, BookOpen
} from 'lucide-react';
import { portfolioApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { getCampusLabel } from '../../lib/utils';
import toast from 'react-hot-toast';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';

const BADGE_ICONS: Record<string, string> = {
  ATTENDANCE: '🎯',
  VOLUNTEER: '🤝',
  WINNER: '🏆',
  ORGANIZER: '📋',
  MENTOR: '💡',
  STREAK: '🔥',
};

const CAMPUS_COLORS: Record<string, string> = {
  VELLORE: '#0052CC',
  CHENNAI: '#10B981',
  AP: '#6366F1',
  BHOPAL: '#F59E0B',
};

export default function PortfolioPage() {
  const { user } = useAuthStore();

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => portfolioApi.me().then((r) => r.data),
    enabled: !!user,
  });

  const handleDownloadResume = async () => {
    try {
      const { data } = await portfolioApi.resume();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${user?.name?.replace(' ', '_')}_VITVerse_Resume.json`;
      a.click();
      toast.success('Resume downloaded!');
    } catch {
      toast.error('Failed to generate resume');
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/portfolio/${user?.id}/public`);
      toast.success('Profile link copied!');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!portfolio) return null;

  const { user: profileUser, stats, skillRadar, certificates, badges, clubs, recentEvents, topInterests } = portfolio;

  const radarData = skillRadar ? [
    { skill: 'Technical', value: skillRadar.technical || 0 },
    { skill: 'Leadership', value: skillRadar.leadership || 0 },
    { skill: 'Management', value: skillRadar.management || 0 },
    { skill: 'Creative', value: skillRadar.creative || 0 },
    { skill: 'Social', value: skillRadar.social || 0 },
  ] : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Profile Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        {/* Cover gradient */}
        <div
          className="h-32 w-full"
          style={{
            background: `linear-gradient(135deg, ${CAMPUS_COLORS[profileUser.campus || 'VELLORE'] || '#0052CC'}40, #6366F140)`,
          }}
        />

        <div className="px-6 pb-6 -mt-10">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 text-2xl font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${CAMPUS_COLORS[profileUser.campus || 'VELLORE']}, #6366F1)`, borderColor: '#ffffff' }}
              >
                {profileUser.name?.charAt(0)}
              </div>
              <div className="mb-1">
                <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>{profileUser.name}</h1>
                <p className="text-sm" style={{ color: '#64748B' }}>
                  {profileUser.regNumber && `${profileUser.regNumber} · `}
                  {profileUser.department} · {getCampusLabel(profileUser.campus || '')}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mb-1">
              <button onClick={handleShare} className="btn-secondary gap-2 text-sm">
                <Share2 className="h-4 w-4" /> Share
              </button>
              <button onClick={handleDownloadResume} className="btn-primary gap-2 text-sm">
                <Download className="h-4 w-4" /> Resume
              </button>
            </div>
          </div>

          {profileUser.bio && (
            <p className="mt-4 max-w-2xl text-sm" style={{ color: '#475569' }}>{profileUser.bio}</p>
          )}

          {topInterests.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-3">
              {topInterests.map((interest: string) => (
                <span key={interest} className="badge badge-secondary">{interest}</span>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Points', value: stats.totalPoints.toLocaleString(), icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Events Attended', value: stats.eventsAttended, icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Clubs Joined', value: stats.clubsJoined, icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Certificates', value: stats.certificatesEarned, icon: Award, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="stat-card"
          >
            <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Skill Radar */}
        <div className="card rounded-2xl p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold" style={{ color: '#0F172A' }}>
            <TrendingUp className="h-4 w-4 text-primary-400" />
            Skill Radar
          </h3>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Radar
                  name="Skills"
                  dataKey="value"
                  stroke="#0052CC"
                  fill="#0052CC"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">
              Attend events to build your skill radar
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="card rounded-2xl p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold" style={{ color: '#0F172A' }}>
            <Star className="h-4 w-4 text-amber-400" />
            Badges ({badges.length})
          </h3>
          {badges.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {badges.map((badge: any) => (
                <div
                  key={badge.id}
                  className="flex flex-col items-center gap-1 rounded-xl p-3 transition-all"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                  title={badge.label}
                >
                  <span className="text-2xl">{BADGE_ICONS[badge.type] || '🎖️'}</span>
                  <span className="text-[10px] text-slate-400 text-center leading-tight">{badge.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-sm">
              <Star className="h-8 w-8 mb-2 opacity-30" />
              Participate to earn badges
            </div>
          )}
        </div>

        {/* Club memberships */}
        <div className="card rounded-2xl p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold" style={{ color: '#0F172A' }}>
            <Users className="h-4 w-4 text-violet-400" />
            My Clubs
          </h3>
          {clubs.length > 0 ? (
            <div className="space-y-2">
              {clubs.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary-400">
                    {m.club.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium" style={{ color: '#0F172A' }}>{m.club.name}</div>
                    <div className="text-xs text-slate-400">{m.role} · {m.club.category}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-sm">
              <Users className="h-8 w-8 mb-2 opacity-30" />
              Join clubs to see them here
            </div>
          )}
        </div>
      </div>

      {/* Certificates */}
      {certificates.length > 0 && (
        <div className="card rounded-2xl p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold" style={{ color: '#0F172A' }}>
            <Award className="h-4 w-4 text-emerald-400" />
            Certificates ({certificates.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {certificates.map((cert: any) => (
              <div
                key={cert.id}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.18)' }}
              >
                <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Award className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium" style={{ color: '#0F172A' }}>{cert.event?.title}</div>
                  <div className="text-xs text-emerald-400">{cert.type}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(cert.issuedAt).toLocaleDateString('en-IN')}
                  </div>
                </div>
                {cert.verified && (
                  <span className="text-[10px] text-emerald-400 font-bold">✓ Verified</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Event History */}
      {recentEvents.length > 0 && (
        <div className="card rounded-2xl p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold" style={{ color: '#0F172A' }}>
            <Calendar className="h-4 w-4 text-blue-400" />
            Event History
          </h3>
          <div className="space-y-2">
            {recentEvents.slice(0, 8).map((reg: any) => (
              <div key={reg.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm" style={{ color: '#0F172A' }}>{reg.event?.title}</span>
                  <span className="ml-2 text-xs" style={{ color: '#64748B' }}>{reg.event?.campus}</span>
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0">
                  {new Date(reg.event?.startDateTime).toLocaleDateString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
