'use client';

import Link from 'next/link';
import { Calendar, MapPin, Users, Tag, Trophy, Star } from 'lucide-react';
import { formatDate, timeUntilEvent, isEventLive, getCampusLabel } from '../../lib/utils';
import type { Event } from '../../types';

interface EventCardProps {
  event: Event;
  compact?: boolean;
}

export function EventCard({ event, compact }: EventCardProps) {
  const live = isEventLive(event.startDateTime, event.endDateTime);

  if (compact) {
    return (
      <Link href={`/events/${event.slug}`}>
        <div className="flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-colors hover:bg-slate-50"
          style={{ border: '1px solid #F1F5F9' }}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'rgba(30,64,175,0.08)' }}>
            <Calendar className="h-5 w-5" style={{ color: '#1e40af' }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[13.5px] truncate" style={{ color: '#0F172A' }}>{event.title}</div>
            <div className="flex items-center gap-3 mt-0.5 text-[12px]" style={{ color: '#64748B' }}>
              {event.venue && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 flex-shrink-0" />{event.venue}</span>}
              <span className="flex items-center gap-1 flex-shrink-0"><Users className="h-3 w-3" />{event._count?.registrations || 0}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {live ? (
              <span className="badge badge-red">Live</span>
            ) : (
              <span className="text-[11px] font-semibold" style={{ color: '#64748B' }}>
                {timeUntilEvent(event.startDateTime)}
              </span>
            )}
            {event.entryFee === 0 ? (
              <span className="badge badge-green">Free</span>
            ) : (
              <span className="text-[11px] font-semibold" style={{ color: '#0F172A' }}>₹{event.entryFee}</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/events/${event.slug}`}>
      <div className="card-hover rounded-2xl overflow-hidden cursor-pointer group">
        {/* Poster */}
        <div className="relative h-44 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1e3a5f 100%)' }}>
          {event.posterUrl ? (
            <img src={event.posterUrl} alt={event.title} className="w-full h-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Calendar className="h-12 w-12 opacity-20 text-white" />
            </div>
          )}
          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {live && <span className="badge badge-red">Live</span>}
            {event.status === 'PUBLISHED' && !live && <span className="badge badge-blue">Upcoming</span>}
          </div>
          <div className="absolute top-3 right-3">
            {event.entryFee === 0
              ? <span className="badge badge-green">Free</span>
              : <span className="badge badge-slate">₹{event.entryFee}</span>}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="font-bold text-[14.5px] mb-2 leading-snug" style={{ color: '#0F172A' }}>{event.title}</div>
          {event.shortDesc && (
            <p className="text-[12.5px] mb-3 line-clamp-2 leading-relaxed" style={{ color: '#64748B' }}>{event.shortDesc}</p>
          )}
          <div className="space-y-1.5">
            {event.startDateTime && (
              <div className="flex items-center gap-2 text-[12px]" style={{ color: '#64748B' }}>
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{formatDate(event.startDateTime, 'dd MMM yyyy, hh:mm a')}</span>
              </div>
            )}
            {event.venue && (
              <div className="flex items-center gap-2 text-[12px]" style={{ color: '#64748B' }}>
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{event.venue} · {getCampusLabel(event.campus)}</span>
              </div>
            )}
            <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid #F1F5F9' }}>
              <div className="flex items-center gap-2 text-[12px]" style={{ color: '#64748B' }}>
                <Users className="h-3.5 w-3.5" />
                <span>{event._count?.registrations || 0} registered</span>
              </div>
              {event.points > 0 && (
                <div className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: '#d97706' }}>
                  <Star className="h-3.5 w-3.5" />{event.points} pts
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
