'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trophy, Star, Lock, Zap } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

const CATEGORY_COLORS: Record<string, string> = {
  booking:     'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  social:      'from-violet-500/20 to-violet-600/10 border-violet-500/30',
  attendance:  'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
  special:     'from-amber-500/20 to-amber-600/10 border-amber-500/30',
  streak:      'from-orange-500/20 to-orange-600/10 border-orange-500/30',
  achievement: 'from-red-500/20 to-red-600/10 border-red-500/30',
};

const CATEGORY_LABELS: Record<string, string> = {
  booking:     '🎟️ Booking',
  social:      '🤝 Social',
  attendance:  '🎯 Attendance',
  special:     '✨ Special',
  streak:      '🔥 Streak',
  achievement: '🏆 Achievement',
};

export default function AchievementsPage() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => api.get('/achievements/me').then((r) => r.data),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const { all = [], totalPoints = 0, unlocked = [] } = data || {};
  const unlockedCount = unlocked.length;
  const totalCount = all.length;

  // Group by category
  const grouped = all.reduce((acc: Record<string, any[]>, ach: any) => {
    const cat = ach.category || 'special';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ach);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="flex items-center gap-3 text-3xl font-bold" style={{ color: '#0F172A' }}>
          <Trophy className="h-8 w-8 text-amber-500" />
          Achievements
        </h1>
        <p className="mt-1" style={{ color: '#64748B' }}>Complete tasks to unlock achievements and earn points.</p>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-5"
        style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(15,23,42,0.03))' }}
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold" style={{ color: '#0F172A' }}>{unlockedCount}</div>
            <div className="mt-1 text-xs" style={{ color: '#64748B' }}>Unlocked</div>
          </div>
          <div>
            <div className="text-3xl font-bold" style={{ color: '#2563eb' }}>{totalPoints.toLocaleString()}</div>
            <div className="mt-1 text-xs" style={{ color: '#64748B' }}>Points Earned</div>
          </div>
          <div>
            <div className="text-3xl font-bold" style={{ color: '#0F172A' }}>{totalCount - unlockedCount}</div>
            <div className="mt-1 text-xs" style={{ color: '#64748B' }}>Remaining</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs" style={{ color: '#64748B' }}>
            <span>Overall Progress</span>
            <span>{unlockedCount}/{totalCount}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: '#E2E8F0' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(unlockedCount / Math.max(totalCount, 1)) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #0052CC, #6366F1)' }}
            />
          </div>
        </div>
      </motion.div>

      {/* Achievements by category */}
      {Object.entries(grouped).map(([category, achievements], catIdx) => (
        <motion.section
          key={category}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: catIdx * 0.08 }}
        >
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold" style={{ color: '#0F172A' }}>
            <span>{CATEGORY_LABELS[category] || category}</span>
            <span className="text-xs font-normal" style={{ color: '#64748B' }}>
              ({(achievements as any[]).filter(a => a.unlocked).length}/{(achievements as any[]).length} unlocked)
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(achievements as any[]).map((ach, i) => (
              <motion.div
                key={ach.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: catIdx * 0.08 + i * 0.04 }}
                className={`relative rounded-2xl border p-4 transition-all duration-300 ${
                  ach.unlocked
                    ? `bg-gradient-to-br ${CATEGORY_COLORS[category] || 'from-slate-100 to-slate-50 border-slate-200'}`
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
              >
                {/* Lock overlay for locked achievements */}
                {!ach.unlocked && (
                  <div className="absolute top-3 right-3">
                    <Lock className="h-3.5 w-3.5" style={{ color: '#94A3B8' }} />
                  </div>
                )}

                {/* Icon */}
                <div className={`text-3xl mb-3 ${!ach.unlocked ? 'grayscale opacity-40' : ''}`}>
                  {ach.icon}
                </div>

                {/* Name */}
                <div className="mb-1 text-sm font-semibold" style={{ color: ach.unlocked ? '#0F172A' : '#64748B' }}>
                  {ach.name}
                </div>

                {/* Description */}
                <div className="mb-3 text-[11px] leading-relaxed" style={{ color: '#64748B' }}>
                  {ach.description}
                </div>

                {/* Points */}
                <div className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  ach.unlocked ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Zap className="h-3 w-3" />
                  +{ach.points} pts
                </div>

                {/* Unlocked date */}
                {ach.unlocked && ach.unlockedAt && (
                  <div className="mt-2 text-[10px]" style={{ color: '#64748B' }}>
                    {new Date(ach.unlockedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                )}

                {/* Unlocked glow effect */}
                {ach.unlocked && (
                  <div className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }} />
                )}
              </motion.div>
            ))}
          </div>
        </motion.section>
      ))}
    </div>
  );
}
