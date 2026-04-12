'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';

interface Seat {
  id: string;
  seatNumber: string;
  row?: string;
  section?: string;
  status: 'AVAILABLE' | 'HELD' | 'LOCKED' | 'BOOKED';
}

interface SeatMapProps {
  eventId: string;
  sessionId?: string;
  seats: Seat[];
  selectedSeatId: string | null;
  onSelect: (seatId: string | null) => void;
}

const SECTION_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  VIP: { bg: '#FEF3C7', border: '#F59E0B', label: 'VIP' },
  PREMIUM: { bg: '#EDE9FE', border: '#8B5CF6', label: 'Premium' },
  GENERAL: { bg: '#F0F9FF', border: '#BAE6FD', label: 'General' },
  ACCESSIBLE: { bg: '#DCFCE7', border: '#86EFAC', label: 'Accessible' },
};

export function SeatMap({ eventId, sessionId, seats: initialSeats, selectedSeatId, onSelect }: SeatMapProps) {
  const [seats, setSeats] = useState<Seat[]>(initialSeats);
  const [summary, setSummary] = useState({ available: 0, held: 0, booked: 0 });
  const { socket, connected } = useSocket('/seats');

  useEffect(() => {
    setSeats(initialSeats);
  }, [initialSeats]);

  useEffect(() => {
    setSummary({
      available: seats.filter(s => s.status === 'AVAILABLE').length,
      held: seats.filter(s => s.status === 'HELD' || s.status === 'LOCKED').length,
      booked: seats.filter(s => s.status === 'BOOKED').length,
    });
  }, [seats]);

  useEffect(() => {
    if (!socket || !connected) return;
    socket.emit('join-event-room', eventId);
    socket.on('seat-updated', ({ seatId, status }: { seatId: string; status: Seat['status'] }) => {
      setSeats(prev => prev.map(s => s.id === seatId ? { ...s, status } : s));
      if (seatId === selectedSeatId && status !== 'AVAILABLE') onSelect(null);
    });
    return () => {
      socket.off('seat-updated');
      socket.emit('leave-event-room', eventId);
    };
  }, [socket, connected, eventId, selectedSeatId, onSelect]);

  // Group by row, then by section within row
  const grouped = seats.reduce((acc: Record<string, Seat[]>, seat) => {
    const row = seat.row || 'General';
    if (!acc[row]) acc[row] = [];
    acc[row].push(seat);
    return acc;
  }, {});

  // Detect unique seat types present
  const seatTypes = [...new Set(seats.map(s => s.section || 'GENERAL'))];
  const hasMultipleTypes = seatTypes.length > 1;

  const getSeatStyle = (seat: Seat) => {
    const selected = seat.id === selectedSeatId;
    if (selected) return { background: '#1e40af', borderColor: '#1e3a8a', color: '#fff', cursor: 'pointer' };
    if (seat.status === 'HELD' || seat.status === 'LOCKED') return { background: '#FEF3C7', borderColor: '#FCD34D', color: '#92400E', cursor: 'not-allowed' };
    if (seat.status === 'BOOKED') return { background: '#F1F5F9', borderColor: '#CBD5E1', color: '#94a3b8', cursor: 'not-allowed' };
    // Available seats are color-coded by type.
    const typeColor = SECTION_COLORS[seat.section || 'GENERAL'] || SECTION_COLORS.GENERAL;
    return { background: typeColor.bg, borderColor: typeColor.border, color: '#0369a1', cursor: 'pointer' };
  };

  if (seats.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-[13px]" style={{ color: '#94a3b8' }}>
        No seat map available for this session
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {hasMultipleTypes && seatTypes.map(type => {
          const tc = SECTION_COLORS[type] || SECTION_COLORS.GENERAL;
          const count = seats.filter(s => (s.section || 'GENERAL') === type && s.status === 'AVAILABLE').length;
          return (
            <div key={type} className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded flex-shrink-0" style={{ background: tc.bg, border: `1.5px solid ${tc.border}` }} />
              <span className="text-[12px]" style={{ color: '#64748B' }}>{tc.label} ({count} avail)</span>
            </div>
          );
        })}
        {[
          { label: `Available (${summary.available})`, bg: '#F0F9FF', border: '#BAE6FD' },
          { label: 'Selected', bg: '#1e40af', border: '#1e3a8a' },
          { label: `Held (${summary.held})`, bg: '#FEF3C7', border: '#FCD34D' },
          { label: `Booked (${summary.booked})`, bg: '#F1F5F9', border: '#CBD5E1' },
        ].filter(item => !hasMultipleTypes || item.label.startsWith('Selected') || item.label.startsWith('Held') || item.label.startsWith('Booked')).map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded flex-shrink-0" style={{ background: item.bg, border: `1.5px solid ${item.border}` }} />
            <span className="text-[12px]" style={{ color: '#64748B' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Stage indicator */}
      <div className="mb-5 text-center">
        <div className="inline-block rounded-xl px-8 py-2 text-[12px] font-bold uppercase tracking-widest"
          style={{ background: '#F1F5F9', color: '#94a3b8', border: '1px solid #E2E8F0' }}>
          Stage / Screen
        </div>
      </div>

      {/* Seats grid */}
      <div className="space-y-3 overflow-x-auto">
        {Object.entries(grouped).map(([row, rowSeats]) => (
          <div key={row} className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-center text-[11px] font-bold" style={{ color: '#94a3b8' }}>{row}</span>
            <div className="flex flex-wrap gap-1.5">
              {rowSeats.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true })).map(seat => (
                <button
                  key={seat.id}
                  onClick={() => seat.status === 'AVAILABLE' && onSelect(seat.id === selectedSeatId ? null : seat.id)}
                  title={`Seat ${seat.seatNumber}${seat.section && seat.section !== 'GENERAL' ? ` (${seat.section})` : ''} - ${seat.status}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold border transition-all"
                  style={getSeatStyle(seat)}
                  disabled={seat.status !== 'AVAILABLE' && seat.id !== selectedSeatId}
                >
                  {seat.seatNumber.replace(seat.row || '', '')}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedSeatId && (
        <div className="mt-4 rounded-xl p-3 text-center" style={{ background: 'rgba(30,64,175,0.08)', border: '1px solid rgba(30,64,175,0.2)' }}>
          <p className="text-[13px] font-semibold" style={{ color: '#1e40af' }}>
            Seat {seats.find(s => s.id === selectedSeatId)?.seatNumber} selected
            {seats.find(s => s.id === selectedSeatId)?.section && seats.find(s => s.id === selectedSeatId)?.section !== 'GENERAL'
              ? ` | ${seats.find(s => s.id === selectedSeatId)?.section}`
              : ''}
          </p>
        </div>
      )}
    </div>
  );
}
