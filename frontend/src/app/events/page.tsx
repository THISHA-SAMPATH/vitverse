'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calendar, Search, Filter, MapPin, Users, ChevronDown, X, SlidersHorizontal } from 'lucide-react';
import { eventsApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { EventCard } from '../../components/events/EventCard';
import { getCampusLabel } from '../../lib/utils';

const CATEGORIES = ['All', 'Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Competition', 'Social'];
const CAMPUSES = [
  { val: '', label: 'All Campuses' },
  { val: 'VELLORE', label: 'VIT Vellore' },
  { val: 'CHENNAI', label: 'VIT Chennai' },
  { val: 'AP', label: 'VIT AP' },
  { val: 'BHOPAL', label: 'VIT Bhopal' },
];

function SkeletonCard() {
  return <div className="skeleton h-72 rounded-2xl" />;
}

export default function EventsPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [campus, setCampus] = useState(user?.campus || '');
  const [entryFee, setEntryFee] = useState('');
  const [page, setPage] = useState(1);

  const params = {
    search: search || undefined,
    category: category || undefined,
    campus: campus || undefined,
    entryFee: entryFee === 'free' ? 0 : undefined,
    page,
    limit: 12,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['events', params],
    queryFn: () => eventsApi.list(params).then(r => r.data),
  });

  const events = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Events</div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>Browse Events</h1>
          <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>
            Discover and register for events happening across all VIT campuses.
          </p>
        </div>
        {pagination && (
          <span className="badge badge-slate">{pagination.total} events</span>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1" style={{ minWidth: 200 }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
            <input className="input pl-9" placeholder="Search events..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="input" style={{ width: 160 }} value={campus} onChange={e => { setCampus(e.target.value); setPage(1); }}>
            {CAMPUSES.map(c => <option key={c.val} value={c.val}>{c.label}</option>)}
          </select>
          <select className="input" style={{ width: 130 }} value={entryFee} onChange={e => setEntryFee(e.target.value)}>
            <option value="">Any Price</option>
            <option value="free">Free Only</option>
          </select>
        </div>
        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat}
              onClick={() => { setCategory(cat === 'All' ? '' : cat); setPage(1); }}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
              style={
                (cat === 'All' && !category) || category === cat
                  ? { background: '#0F172A', color: '#fff' }
                  : { background: '#F1F5F9', color: '#64748B' }
              }>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : events.length === 0
            ? (
              <div className="col-span-full text-center py-16">
                <Calendar className="h-10 w-10 mx-auto mb-3" style={{ color: '#94a3b8' }} />
                <p className="font-semibold text-[15px]" style={{ color: '#0F172A' }}>No events found</p>
                <p className="text-[13px] mt-1" style={{ color: '#64748B' }}>Try adjusting your search or filters.</p>
              </div>
            )
            : events.map((event: any, i: number) => (
              <motion.div key={event.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <EventCard event={event} />
              </motion.div>
            ))
        }
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button className="btn-secondary text-[13px] py-2 px-4" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </button>
          <span className="text-[13px]" style={{ color: '#64748B' }}>
            Page {page} of {pagination.pages}
          </span>
          <button className="btn-secondary text-[13px] py-2 px-4" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
