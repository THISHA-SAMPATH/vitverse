'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Search, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingsApi, eventsApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import { formatDate } from '../../../lib/utils';

export default function PresidentRegistrationsPage() {
  const { user } = useAuthStore();
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['president-events-list', user?.id],
    queryFn: () => eventsApi.list({ limit: 50, createdBy: user?.id, includeAll: true }).then((r) => r.data),
    enabled: !!user?.id,
  });

  const { data: registrationsData, isLoading: registrationsLoading } = useQuery({
    queryKey: ['president-event-registrations', selectedEvent],
    queryFn: () => bookingsApi.eventRegistrations(selectedEvent).then((r) => r.data),
    enabled: !!selectedEvent,
  });

  const events = eventsData?.data || [];
  const activeEvent = events.find((event: any) => event.id === selectedEvent);
  const registrations = registrationsData || [];

  const filtered = registrations.filter((registration: any) =>
    !search
    || registration.name?.toLowerCase().includes(search.toLowerCase())
    || registration.regNo?.toLowerCase?.().includes(search.toLowerCase()),
  );

  const handleExport = async () => {
    if (!selectedEvent) return;

    try {
      const { data } = await bookingsApi.exportEventRegistrations(selectedEvent);
      const blob = new Blob([data.csv], { type: data.contentType || 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', data.filename || 'event-registrations.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Registrations exported');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Export failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>President / Registrations</div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>Event Registrations</h1>
          <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>
            View who has registered for your events and export the participant list as CSV.
          </p>
        </div>
      </div>

      <div className="card p-5">
        <label className="label">Select Event</label>
        {eventsLoading ? (
          <div className="skeleton h-10 w-full" />
        ) : (
          <select className="input" style={{ maxWidth: 480 }} value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
            <option value="">Choose an event</option>
            {events.map((event: any) => (
              <option key={event.id} value={event.id}>{event.title} ({formatDate(event.startDateTime)})</option>
            ))}
          </select>
        )}
      </div>

      {selectedEvent && activeEvent && (
        <>
          <div className="card p-5">
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Event</div>
                <div className="font-bold text-[15px]" style={{ color: '#0F172A' }}>{activeEvent.title}</div>
              </div>
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Date</div>
                <div className="text-[14px]" style={{ color: '#0F172A' }}>{formatDate(activeEvent.startDateTime)}</div>
              </div>
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Venue</div>
                <div className="text-[14px]" style={{ color: '#0F172A' }}>{activeEvent.venue || 'TBA'}</div>
              </div>
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Registrations</div>
                <div className="text-[14px] font-bold" style={{ color: '#1e40af' }}>{registrations.length} / {activeEvent.capacity || '-'}</div>
              </div>
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Checked In</div>
                <div className="text-[14px] font-bold" style={{ color: '#059669' }}>{registrations.filter((registration: any) => registration.checkedIn).length}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between p-5 flex-wrap gap-3">
              <div className="section-title">Participant List</div>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
                  <input className="input pl-9" style={{ width: 220 }} placeholder="Search by name or reg no..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <button className="btn-secondary text-[12px] py-2 px-3" onClick={handleExport}>
                  <Download className="h-3.5 w-3.5" /> Export
                </button>
              </div>
            </div>
            <div className="table-wrapper border-0 border-t rounded-none" style={{ borderColor: '#E2E8F0' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Reg No.</th>
                    <th>Department</th>
                    <th>Year</th>
                    <th>Seat</th>
                    <th>Status</th>
                    <th>Check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {registrationsLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10" style={{ color: '#64748B' }}>Loading registrations...</td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10" style={{ color: '#64748B' }}>No registrations found for this event.</td>
                    </tr>
                  ) : filtered.map((registration: any, idx: number) => (
                    <tr key={registration.id}>
                      <td className="text-[13px]" style={{ color: '#94a3b8' }}>{idx + 1}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar h-7 w-7 text-[10px] rounded-full">{registration.name?.charAt(0)}</div>
                          <span className="font-semibold text-[13px]" style={{ color: '#0F172A' }}>{registration.name}</span>
                        </div>
                      </td>
                      <td className="text-[13px] font-mono" style={{ color: '#64748B' }}>{registration.regNo || '-'}</td>
                      <td className="text-[13px]" style={{ color: '#64748B' }}>{registration.dept || '-'}</td>
                      <td className="text-[13px]" style={{ color: '#64748B' }}>{registration.year || '-'}</td>
                      <td className="text-[13px] font-semibold" style={{ color: '#1e40af' }}>{registration.seat || '-'}</td>
                      <td>
                        <span className={`badge ${registration.status === 'CONFIRMED' ? 'badge-green' : registration.status === 'WAITLISTED' ? 'badge-amber' : 'badge-slate'}`}>
                          {registration.status}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${registration.checkedIn ? 'badge-green' : 'badge-slate'}`}>
                          {registration.checkedIn ? 'Checked In' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!selectedEvent && (
        <div className="card p-12 text-center">
          <ClipboardList className="h-10 w-10 mx-auto mb-3" style={{ color: '#94a3b8' }} />
          <p className="font-semibold" style={{ color: '#0F172A' }}>Select an event above</p>
          <p className="text-[13px] mt-1" style={{ color: '#64748B' }}>Choose one of your events to see its full participant and registration list.</p>
        </div>
      )}
    </div>
  );
}
