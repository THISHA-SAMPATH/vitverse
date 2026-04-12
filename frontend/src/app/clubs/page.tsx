'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Users, Star, ChevronRight, Zap } from 'lucide-react';
import Link from 'next/link';
import { clubsApi } from '../../lib/api';
import { getCampusLabel, getCampusColor, cn } from '../../lib/utils';

const CAMPUSES = ['', 'VELLORE', 'CHENNAI', 'AP', 'BHOPAL'];
const CAMPUS_LABELS: Record<string, string> = {
  '': 'All',
  VELLORE: 'Vellore',
  CHENNAI: 'Chennai',
  AP: 'AP',
  BHOPAL: 'Bhopal',
};

export default function ClubsPage() {
  const [search, setSearch] = useState('');
  const [campus, setCampus] = useState('');
  const [category, setCategory] = useState('');

  const { data: clubs, isLoading } = useQuery({
    queryKey: ['clubs', { search, campus, category }],
    queryFn: () => clubsApi.list({ search, campus: campus || undefined, category: category || undefined }).then((r) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['club-categories'],
    queryFn: () => clubsApi.categories().then((r) => r.data),
  });

  // Group clubs by category for Netflix-style display
  const grouped: Record<string, any[]> = {};
  (clubs || []).forEach((club: any) => {
    if (!grouped[club.category]) grouped[club.category] = [];
    grouped[club.category].push(club);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header">
        <div className="mb-1 text-[12px] font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>Student / Clubs</div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>Explore Clubs</h1>
        <p className="mt-1 text-[13.5px]" style={{ color: '#64748B' }}>Discover {clubs?.length || 0} active clubs across VIT campuses.</p>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
          <input
            className="input pl-10"
            placeholder="Search clubs by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {CAMPUSES.map((c) => (
            <button
              key={c}
              onClick={() => setCampus(c)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-medium transition-all',
                campus === c ? 'text-white' : 'hover:bg-slate-100'
              )}
              style={campus === c ? { background: 'linear-gradient(135deg, #0F172A 0%, #1e40af 100%)' } : { background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}
            >
              {CAMPUS_LABELS[c]}
            </button>
          ))}
        </div>

        {categories && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setCategory('')}
              className="rounded-full px-3 py-1 text-xs"
              style={!category ? { background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.18)' } : { background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}>
              All Categories
            </button>
            {categories.map((cat: any) => (
              <button
                key={cat.category}
                onClick={() => setCategory(cat.category)}
                className="rounded-full px-3 py-1 text-xs"
                style={category === cat.category ? { background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.18)' } : { background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}
              >
                {cat.category} ({cat._count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Netflix-style grouped view */}
      {isLoading ? (
        <div className="space-y-8">
          {[1, 2].map((g) => (
            <div key={g} className="space-y-3">
              <div className="skeleton h-6 w-32 rounded" />
              <div className="flex gap-4 overflow-x-auto pb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-48 w-40 rounded-2xl flex-shrink-0" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : search || category ? (
        // Flat grid when searching
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clubs?.map((club: any) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>
      ) : (
        // Grouped horizontal scroll
        Object.entries(grouped).map(([cat, catClubs]) => (
          <section key={cat} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold" style={{ color: '#0F172A' }}>
                <span>{cat}</span>
                <span className="text-xs font-normal" style={{ color: '#64748B' }}>({catClubs.length})</span>
              </h2>
              <button className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#2563eb' }}>
                See all <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1" style={{ scrollSnapType: 'x mandatory' }}>
              {catClubs.map((club: any) => (
                <div key={club.id} style={{ scrollSnapAlign: 'start' }} className="flex-shrink-0 w-48">
                  <ClubCard club={club} compact />
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {!isLoading && clubs?.length === 0 && (
        <div className="text-center py-20">
          <Users className="mx-auto mb-4 h-12 w-12" style={{ color: '#94a3b8' }} />
          <h3 className="text-lg font-semibold" style={{ color: '#0F172A' }}>No clubs found</h3>
          <p className="mt-1 text-sm" style={{ color: '#64748B' }}>Try a different search or campus.</p>
        </div>
      )}
    </div>
  );
}

function ClubCard({ club, compact = false }: { club: any; compact?: boolean }) {
  const campusColor = getCampusColor(club.campus);

  if (compact) {
    return (
      <Link href={`/clubs/${club.slug}`}>
        <motion.div
          whileHover={{ y: -4 }}
          className="card-hover overflow-hidden cursor-pointer h-full"
        >
          <div className="h-24 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${campusColor}33, #0f172a)` }}>
            {club.logo ? (
              <img src={club.logo} alt={club.name} className="w-full h-full object-cover opacity-80" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-black text-white opacity-30">{club.name[0]}</span>
              </div>
            )}
          </div>
          <div className="p-3">
            <h3 className="truncate text-sm font-semibold" style={{ color: '#0F172A' }}>{club.name}</h3>
            <div className="flex items-center gap-1 mt-1">
              <Users className="h-3 w-3" style={{ color: '#64748B' }} />
              <span className="text-xs" style={{ color: '#64748B' }}>{club._count?.members || 0}</span>
              <span className="ml-auto">
                <Star className="h-3 w-3 text-amber-500" />
              </span>
              <span className="text-xs text-amber-500">{club.healthScore?.toFixed(0) || 0}</span>
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link href={`/clubs/${club.slug}`}>
      <motion.div
        whileHover={{ y: -4 }}
        className="card-hover overflow-hidden cursor-pointer"
      >
        <div className="h-28 relative"
          style={{ background: `linear-gradient(135deg, ${campusColor}22, #0f172a)` }}>
          {club.logo ? (
            <img src={club.logo} alt={club.name} className="w-full h-full object-cover opacity-60" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-black opacity-10">{club.name[0]}</span>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <span className="badge bg-black/40 text-white/70 border border-white/10 text-[10px]">
              {getCampusLabel(club.campus)}
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="text-sm font-bold" style={{ color: '#0F172A' }}>{club.name}</h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Zap className="h-3 w-3 text-amber-500" />
              <span className="text-xs font-medium text-amber-500">{club.healthScore?.toFixed(0) || 0}</span>
            </div>
          </div>
          <p className="mb-3 line-clamp-2 text-xs" style={{ color: '#64748B' }}>{club.shortBio}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs" style={{ color: '#64748B' }}>
              <Users className="h-3 w-3" />
              {club._count?.members || 0} members
            </div>
            <span className="text-xs font-medium" style={{ color: campusColor }}>{club.category}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
