'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarClock, Plus, X, Video, MapPin, Users, Clock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { collaborationApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function MeetingsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const today = new Date();
  const clubId = searchParams.get('clubId') || undefined;
  const clubName = searchParams.get('clubName') || undefined;
  const [currentDate, setCurrentDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', date: '', time: '', type: 'ONLINE', venue: '', link: '', agenda: '',
  });

  const { data: meetingsData } = useQuery({
    queryKey: ['collaboration-meetings', clubId],
    queryFn: () => collaborationApi.meetings(clubId).then((r) => r.data),
    refetchInterval: 2500,
  });

  const createMeetingMutation = useMutation({
    mutationFn: (payload: any) => collaborationApi.createMeeting({ ...payload, clubId }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Meeting scheduled successfully');
      setShowForm(false);
      setForm({ title: '', date: '', time: '', type: 'ONLINE', venue: '', link: '', agenda: '' });
      qc.invalidateQueries({ queryKey: ['collaboration-meetings', clubId] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to schedule meeting'),
  });

  const meetings = meetingsData || [];
  const daysInMonth = getDaysInMonth(currentDate.year, currentDate.month);
  const firstDayOfMonth = new Date(currentDate.year, currentDate.month, 1).getDay();

  const prevMonth = () => setCurrentDate((date) => date.month === 0 ? { year: date.year - 1, month: 11 } : { ...date, month: date.month - 1 });
  const nextMonth = () => setCurrentDate((date) => date.month === 11 ? { year: date.year + 1, month: 0 } : { ...date, month: date.month + 1 });
  const getMeetingDates = () => meetings
    .filter((meeting: any) => {
      const value = new Date(meeting.date);
      return value.getMonth() === currentDate.month && value.getFullYear() === currentDate.year;
    })
    .map((meeting: any) => new Date(meeting.date).getDate());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMeetingMutation.mutate({
      title: form.title,
      date: form.date,
      time: form.time,
      type: form.type,
      venue: form.type === 'ONLINE' ? undefined : form.venue,
      link: form.type === 'ONLINE' ? form.link : undefined,
      agenda: form.agenda,
    });
  };

  const canSchedule = user?.role === 'CLUB_PRESIDENT';

  return (
    <div className="space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>{canSchedule ? 'President / Meetings' : 'Student / Meetings'}</div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>{canSchedule ? 'Meeting Scheduler' : 'Club Meeting Schedule'}</h1>
          <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>
            {canSchedule ? 'Schedule and track team meetings, syncs, and planning sessions.' : `View upcoming meetings, agendas, and join links shared by ${clubName || 'your club'}.`}
          </p>
        </div>
        {canSchedule && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> Schedule Meeting
          </button>
        )}
      </div>

      {canSchedule && showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="section-title">New Meeting</div>
            <button onClick={() => setShowForm(false)} className="btn-ghost p-2"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label">Meeting Title *</label>
              <input className="input" placeholder="e.g., Weekly Core Team Sync" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <label className="label">Time *</label>
              <input type="time" className="input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
            </div>
            <div>
              <label className="label">Meeting Type</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">In-Person</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="label">{form.type === 'ONLINE' ? 'Meeting Link' : 'Venue'}</label>
              <input
                className="input"
                placeholder={form.type === 'ONLINE' ? 'https://meet.google.com/...' : 'e.g., MB-101'}
                value={form.type === 'ONLINE' ? form.link : form.venue}
                onChange={(e) => form.type === 'ONLINE' ? setForm({ ...form, link: e.target.value }) : setForm({ ...form, venue: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Agenda</label>
              <textarea className="input" rows={3} placeholder="What will be discussed in this meeting?" value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2" style={{ borderTop: '1px solid #E2E8F0' }}>
              <button type="submit" className="btn-primary" disabled={createMeetingMutation.isPending}>
                {createMeetingMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Scheduling...</> : <><CalendarClock className="h-4 w-4" /> Schedule Meeting</>}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_1fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold" style={{ color: '#0F172A' }}>
              {MONTHS[currentDate.month]} {currentDate.year}
            </div>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="btn-ghost p-1.5 rounded-lg"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={nextMonth} className="btn-ghost p-1.5 rounded-lg"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-0 mb-2">
            {DAYS.map((day) => (
              <div key={day} className="text-center text-[10px] font-semibold py-1" style={{ color: '#94a3b8' }}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0">
            {Array.from({ length: firstDayOfMonth }).map((_, index) => <div key={`empty-${index}`} />)}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const isToday = day === today.getDate() && currentDate.month === today.getMonth() && currentDate.year === today.getFullYear();
              const hasMeeting = getMeetingDates().includes(day);
              return (
                <div key={day} className="flex flex-col items-center py-1 cursor-pointer">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-medium transition-colors ${isToday ? 'text-white' : 'hover:bg-slate-100'}`} style={isToday ? { background: 'linear-gradient(135deg, #0F172A, #1e40af)' } : { color: '#0F172A' }}>
                    {day}
                  </div>
                  {hasMeeting && <div className="h-1 w-1 rounded-full mt-0.5" style={{ background: '#2563eb' }} />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <div className="section-title mb-4">All Meetings</div>
          <div className="space-y-3">
            {meetings.length === 0 ? (
              <div className="text-center py-10" style={{ color: '#64748B' }}>No meetings scheduled yet.</div>
            ) : meetings.map((meeting: any) => (
              <div key={meeting.id} className="flex items-start gap-4 rounded-xl p-4 transition-colors" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: meeting.type === 'ONLINE' ? 'rgba(37,99,235,0.1)' : 'rgba(5,150,105,0.1)' }}>
                  {meeting.type === 'ONLINE' ? <Video className="h-4 w-4" style={{ color: '#2563eb' }} /> : <MapPin className="h-4 w-4" style={{ color: '#059669' }} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[13.5px]" style={{ color: '#0F172A' }}>{meeting.title}</span>
                    <span className={`badge ${meeting.status === 'upcoming' ? 'badge-blue' : 'badge-slate'}`}>{meeting.status}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-[12px]" style={{ color: '#64748B' }}>
                      <Clock className="h-3 w-3" /> {meeting.date} | {meeting.time}
                    </span>
                    {meeting.venue && (
                      <span className="flex items-center gap-1 text-[12px]" style={{ color: '#64748B' }}>
                        <MapPin className="h-3 w-3" /> {meeting.venue}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[12px]" style={{ color: '#64748B' }}>
                      <Users className="h-3 w-3" /> {meeting.attendees} attendees
                    </span>
                  </div>
                  {meeting.agenda && <div className="text-[12px] mt-2" style={{ color: '#64748B' }}>{meeting.agenda}</div>}
                </div>
                {meeting.link && (
                  <a href={meeting.link} target="_blank" rel="noopener noreferrer" className="btn-primary text-[12px] py-1.5 px-3 flex-shrink-0">
                    Join
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
