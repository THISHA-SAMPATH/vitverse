'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock } from 'lucide-react';
import { eventsApi } from '../../../lib/api';
import { getCampusLabel, getCampusColor, formatCurrency } from '../../../lib/utils';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, getDay, addMonths, subMonths } from 'date-fns';

export default function EventCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const router = useRouter();

  const { data } = useQuery({
    queryKey: ['events-calendar', format(currentMonth, 'yyyy-MM')],
    queryFn: () => eventsApi.list({ limit: 100, page: 1 }).then(r => r.data),
  });

  const events = data?.data || [];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startWeekday = getDay(monthStart); // 0=Sun

  const getEventsForDay = (day: Date) =>
    events.filter((e: any) => isSameDay(new Date(e.startDateTime), day));

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>Event Calendar</h1>
          <p className="text-[14px] mt-1" style={{ color: '#64748B' }}>All upcoming events at a glance</p>
        </div>
        <Link href="/events" className="btn-secondary">List View</Link>
      </div>

      <section className="card p-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-6">
          <button className="btn-ghost" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>{format(currentMonth, 'MMMM yyyy')}</h2>
          <button className="btn-ghost" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wider py-2" style={{ color: '#94a3b8' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startWeekday }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const today = isToday(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(isSameDay(day, selectedDay || new Date(0)) ? null : day)}
                className="relative rounded-xl p-2 text-left transition-all min-h-[64px]"
                style={{
                  background: isSelected ? 'rgba(30,64,175,0.08)' : today ? '#F0F9FF' : 'transparent',
                  border: isSelected ? '1.5px solid rgba(30,64,175,0.3)' : today ? '1px solid #BAE6FD' : '1px solid transparent',
                }}
              >
                <span className="text-[12px] font-semibold" style={{ color: today ? '#1e40af' : '#0F172A' }}>
                  {format(day, 'd')}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((e: any) => (
                    <div
                      key={e.id}
                      className="truncate rounded px-1 text-[10px] font-semibold"
                      style={{ background: getCampusColor(e.campus) + '20', color: getCampusColor(e.campus) }}
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px]" style={{ color: '#94a3b8' }}>+{dayEvents.length - 2} more</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected day events */}
      {selectedDay && (
        <section className="card p-6">
          <h3 className="text-[16px] font-bold mb-4" style={{ color: '#0F172A' }}>
            Events on {format(selectedDay, 'EEEE, d MMMM yyyy')}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-[14px]" style={{ color: '#94a3b8' }}>No events on this day.</p>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((e: any) => (
                <Link key={e.id} href={`/events/${e.slug}`} className="block rounded-2xl p-4 transition-all hover:shadow-sm"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[14px] truncate" style={{ color: '#0F172A' }}>{e.title}</div>
                      <div className="flex flex-wrap gap-3 mt-1 text-[12px]" style={{ color: '#64748B' }}>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(e.startDateTime), 'hh:mm a')}</span>
                        {e.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.venue}</span>}
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{getCampusLabel(e.campus)}</span>
                      </div>
                    </div>
                    <span className="text-[12px] font-semibold shrink-0" style={{ color: e.entryFee > 0 ? '#b45309' : '#059669' }}>
                      {formatCurrency(e.entryFee || 0)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
