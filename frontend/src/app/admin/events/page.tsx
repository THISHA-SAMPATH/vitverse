'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, CheckCircle, XCircle, Clock, AlertTriangle,
  MapPin, Users, Eye, X, Loader2,
  BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsApi } from '../../../lib/api';
import { formatDate, formatDateTime } from '../../../lib/utils';

/* ─── Gantt Chart Component ───────────────────────────────────── */
function GanttChart({ events }: { events: any[] }) {
  if (!events || events.length === 0) return (
    <div className="text-center py-8" style={{ color: '#64748B' }}>
      <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
      <p className="text-[13px]">No events to display on timeline</p>
    </div>
  );

  // Build a timeline spanning from earliest to latest
  const validEvents = events.filter(e => e.startDateTime && e.endDateTime);
  if (validEvents.length === 0) return null;

  const minTime = Math.min(...validEvents.map(e => new Date(e.startDateTime).getTime()));
  const maxTime = Math.max(...validEvents.map(e => new Date(e.endDateTime).getTime()));
  const totalDuration = maxTime - minTime || 1;

  // Detect clashes (overlapping time + same venue)
  const clashes = new Set<string>();
  for (let i = 0; i < validEvents.length; i++) {
    for (let j = i + 1; j < validEvents.length; j++) {
      const a = validEvents[i], b = validEvents[j];
      const aStart = new Date(a.startDateTime).getTime();
      const aEnd = new Date(a.endDateTime).getTime();
      const bStart = new Date(b.startDateTime).getTime();
      const bEnd = new Date(b.endDateTime).getTime();
      const timeOverlap = aStart < bEnd && aEnd > bStart;
      const sameVenue = a.venue && b.venue && a.venue.toLowerCase() === b.venue.toLowerCase();
      if (timeOverlap && sameVenue) {
        clashes.add(a.id);
        clashes.add(b.id);
      }
    }
  }

  const colors = ['#1e40af', '#059669', '#7c3aed', '#d97706', '#be185d', '#0891b2'];

  return (
    <div>
      {clashes.size > 0 && (
        <div className="mb-4 rounded-xl p-3 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: '#ef4444' }} />
          <span className="text-[13px] font-semibold" style={{ color: '#ef4444' }}>
            {clashes.size} event(s) have scheduling conflicts (same venue + overlapping time). Review carefully before approving.
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 600 }}>
          {/* Date labels */}
          <div className="flex mb-2 ml-40">
            {[0, 0.25, 0.5, 0.75, 1].map(pct => (
              <div key={pct} className="flex-1 text-[10px]" style={{ color: '#94a3b8' }}>
                {formatDate(new Date(minTime + totalDuration * pct).toISOString(), 'dd MMM')}
              </div>
            ))}
          </div>
          {/* Grid lines */}
          <div className="relative">
            {[0.25, 0.5, 0.75].map(pct => (
              <div key={pct} className="absolute top-0 bottom-0 w-px" style={{ left: `calc(10rem + ${pct * 100}% - ${pct * 10}rem)`, background: '#E2E8F0' }} />
            ))}
            {/* Event bars */}
            {validEvents.map((event, idx) => {
              const left = ((new Date(event.startDateTime).getTime() - minTime) / totalDuration) * 100;
              const width = Math.max(1, ((new Date(event.endDateTime).getTime() - new Date(event.startDateTime).getTime()) / totalDuration) * 100);
              const isClash = clashes.has(event.id);
              const color = isClash ? '#ef4444' : colors[idx % colors.length];
              return (
                <div key={event.id} className="flex items-center mb-2" style={{ height: 36 }}>
                  <div className="w-40 pr-3 flex-shrink-0">
                    <div className="text-[11px] font-semibold truncate" style={{ color: '#0F172A' }}>{event.title}</div>
                    {event.venue && <div className="text-[10px] truncate" style={{ color: '#94a3b8' }}>{event.venue}</div>}
                  </div>
                  <div className="flex-1 relative h-8">
                    <div
                      className="absolute h-7 rounded-lg flex items-center px-2 top-0.5"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        minWidth: 8,
                        background: `${color}20`,
                        border: `2px solid ${color}`,
                      }}
                    >
                      <span className="text-[10px] font-semibold truncate" style={{ color }}>
                        {isClash ? '⚠ ' : ''}{event.title}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px]" style={{ color: '#64748B' }}>
        <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: '#1e40af' }} /> No Conflict</div>
        <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: '#ef4444' }} /> Schedule Conflict</div>
      </div>
    </div>
  );
}

/* ─── Event Detail Modal ───────────────────────────────────── */
function EventDetailModal({ event, onClose, onApprove, onReject }: any) {
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="modal-content" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: '#0F172A' }}>{event.title}</h2>
            <div className="text-[12px] mt-1" style={{ color: '#64748B' }}>{event.club?.name || 'Unknown Club'}</div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3 mb-5">
          {[
            { icon: Calendar, label: 'Start', value: event.startDateTime ? formatDateTime(event.startDateTime) : '—' },
            { icon: Calendar, label: 'End', value: event.endDateTime ? formatDateTime(event.endDateTime) : '—' },
            { icon: MapPin, label: 'Venue', value: event.venue || 'TBA' },
            { icon: Users, label: 'Capacity', value: event.capacity || 'Unlimited' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#F8FAFC' }}>
              <item.icon className="h-4 w-4 flex-shrink-0" style={{ color: '#64748B' }} />
              <span className="text-[12px] font-semibold w-16 flex-shrink-0" style={{ color: '#64748B' }}>{item.label}</span>
              <span className="text-[13px]" style={{ color: '#0F172A' }}>{item.value}</span>
            </div>
          ))}
          {event.description && (
            <div className="rounded-xl p-3" style={{ background: '#F8FAFC' }}>
              <div className="text-[12px] font-semibold mb-1" style={{ color: '#64748B' }}>Description</div>
              <p className="text-[13px] leading-relaxed" style={{ color: '#0F172A' }}>{event.description}</p>
            </div>
          )}
        </div>

        {showRejectForm ? (
          <div className="space-y-3">
            <div>
              <label className="label">Rejection Reason *</label>
              <textarea className="input" rows={3} placeholder="Explain why this event is being rejected..."
                value={rejectNote} onChange={e => setRejectNote(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button className="btn-danger flex-1" onClick={() => rejectNote && onReject(rejectNote)} disabled={!rejectNote}>
                <XCircle className="h-4 w-4" /> Confirm Reject
              </button>
              <button className="btn-secondary" onClick={() => setShowRejectForm(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button className="btn-primary flex-1" onClick={onApprove}>
              <CheckCircle className="h-4 w-4" /> Approve Event
            </button>
            <button className="btn-danger flex-1" onClick={() => setShowRejectForm(true)}>
              <XCircle className="h-4 w-4" /> Reject
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function AdminEventsPage() {
  const qc = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'gantt'>('pending');
  const [filter, setFilter] = useState('ALL');

  const { data: allEventsData, isLoading } = useQuery({
    queryKey: ['admin-events-all'],
    queryFn: () => eventsApi.list({ limit: 100, includeAll: true }).then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => eventsApi.publish(id).then(r => r.data),
    onSuccess: () => { toast.success('Event approved and published!'); qc.invalidateQueries({ queryKey: ['admin-events-all'] }); setSelectedEvent(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => eventsApi.reject(id, note).then(r => r.data),
    onSuccess: () => { toast.success('Event rejected.'); qc.invalidateQueries({ queryKey: ['admin-events-all'] }); setSelectedEvent(null); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to reject'),
  });

  const allEvents = allEventsData?.data || [];
  const pendingEvents = allEvents.filter((e: any) => e.status === 'DRAFT');
  const filtered = filter === 'ALL' ? allEvents : allEvents.filter((e: any) => e.status === filter);

  const statusBadge: Record<string, string> = {
    DRAFT: 'badge-amber', PUBLISHED: 'badge-blue', LIVE: 'badge-green', COMPLETED: 'badge-slate', CANCELLED: 'badge-red',
  };

  const tabs = [
    { id: 'pending', label: `Pending (${pendingEvents.length})` },
    { id: 'all', label: 'All Events' },
    { id: 'gantt', label: '📊 Gantt / Clash View' },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Admin · Events</div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>Event Approvals</h1>
          <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>
            Review submitted events. Use the Gantt view to detect scheduling conflicts before approving.
          </p>
        </div>
        {pendingEvents.length > 0 && (
          <span className="badge badge-amber text-sm px-4 py-2">{pendingEvents.length} awaiting review</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#F1F5F9' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
            style={activeTab === tab.id ? { background: '#fff', color: '#0F172A', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { color: '#64748B' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Gantt View */}
      {activeTab === 'gantt' && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5" style={{ color: '#1e40af' }} />
            <div>
              <div className="section-title">Event Timeline & Conflict Detection</div>
              <div className="section-subtitle">Events are shown on a shared timeline. Red bars = scheduling conflict (same venue, overlapping time).</div>
            </div>
          </div>
          <GanttChart events={allEvents.filter((e: any) => e.status !== 'CANCELLED')} />
        </div>
      )}

      {/* Pending Events */}
      {activeTab === 'pending' && (
        <div className="card p-5">
          <div className="section-title mb-4">Events Awaiting Approval</div>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-24" />)}</div>
          ) : pendingEvents.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-10 w-10 mx-auto mb-3" style={{ color: '#059669' }} />
              <p className="font-semibold" style={{ color: '#0F172A' }}>All caught up!</p>
              <p className="text-[13px] mt-1" style={{ color: '#64748B' }}>No events pending approval right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingEvents.map((event: any) => (
                <motion.div key={event.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-4 rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(217,119,6,0.08)' }}>
                    <Clock className="h-5 w-5" style={{ color: '#d97706' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[14px]" style={{ color: '#0F172A' }}>{event.title}</span>
                      <span className="badge badge-amber">Pending</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-[12px]" style={{ color: '#64748B' }}>
                      {event.club?.name && <span>{event.club.name}</span>}
                      {event.startDateTime && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(event.startDateTime)}</span>}
                      {event.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.venue}</span>}
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />Cap: {event.capacity || '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button className="btn-ghost p-2 rounded-lg" onClick={() => setSelectedEvent(event)} title="View details">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="btn-primary text-[12px] py-2 px-3" onClick={() => approveMutation.mutate(event.id)} disabled={approveMutation.isPending}>
                      {approveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                      Approve
                    </button>
                    <button className="btn-danger text-[12px] py-2 px-3" onClick={() => { setSelectedEvent(event); }}>
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Events */}
      {activeTab === 'all' && (
        <div className="card">
          <div className="flex items-center justify-between p-5 pb-3 flex-wrap gap-3">
            <div className="section-title">All Events</div>
            <div className="flex gap-2 flex-wrap">
              {['ALL', 'DRAFT', 'PUBLISHED', 'LIVE', 'COMPLETED', 'CANCELLED'].map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                  style={filter === s ? { background: '#0F172A', color: '#fff' } : { background: '#F1F5F9', color: '#64748B' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="table-wrapper border-0 border-t rounded-none" style={{ borderColor: '#E2E8F0' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Club</th>
                  <th>Date</th>
                  <th>Venue</th>
                  <th>Registrations</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="skeleton h-5 w-full" /></td>
                    ))}
                  </tr>
                )) : filtered.map((event: any) => (
                  <tr key={event.id}>
                    <td>
                      <div className="font-semibold text-[13px]" style={{ color: '#0F172A' }}>{event.title}</div>
                    </td>
                    <td className="text-[13px]" style={{ color: '#64748B' }}>{event.club?.name || '—'}</td>
                    <td className="text-[13px]" style={{ color: '#64748B' }}>{event.startDateTime ? formatDate(event.startDateTime) : '—'}</td>
                    <td className="text-[13px]" style={{ color: '#64748B' }}>{event.venue || '—'}</td>
                    <td className="text-[13px] font-semibold" style={{ color: '#0F172A' }}>{event._count?.registrations || 0}</td>
                    <td><span className={`badge ${statusBadge[event.status] || 'badge-slate'}`}>{event.status}</span></td>
                    <td>
                      {event.status === 'DRAFT' && (
                        <div className="flex gap-2">
                          <button className="btn-ghost text-[11px] py-1.5 px-2" onClick={() => setSelectedEvent(event)}>
                            <Eye className="h-3 w-3" /> Review
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Event detail modal */}
      <AnimatePresence>
        {selectedEvent && (
          <EventDetailModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onApprove={() => approveMutation.mutate(selectedEvent.id)}
            onReject={(note: string) => rejectMutation.mutate({ id: selectedEvent.id, note })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
