'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { seatsApi } from '../../lib/api';

export default function WaitlistClaimPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('eventId');
  const seatId = searchParams.get('seatId');
  const sessionId = searchParams.get('sessionId');
  const eventSlug = searchParams.get('eventSlug');

  const CLAIM_WINDOW = 15 * 60; // 15 minutes
  const [timeLeft, setTimeLeft] = useState(CLAIM_WINDOW);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) { setExpired(true); return; }
    const t = setInterval(() => setTimeLeft(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const pct = (timeLeft / CLAIM_WINDOW) * 100;

  const holdSeat = useMutation({
    mutationFn: () => seatsApi.holdSeat(eventId!, seatId!, sessionId || undefined).then(r => r.data),
    onSuccess: () => {
      toast.success('Seat held! Complete your registration.');
      router.push(eventSlug ? `/events/${eventSlug}` : '/events');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Seat no longer available'),
  });

  if (!eventId || !seatId) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto mt-12">
        <AlertTriangle className="h-10 w-10 mx-auto mb-3" style={{ color: '#f59e0b' }} />
        <p style={{ color: '#64748B' }}>Invalid waitlist claim link.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12 space-y-6">
      <section className="card p-8 text-center">
        {expired ? (
          <>
            <AlertTriangle className="h-12 w-12 mx-auto mb-4" style={{ color: '#ef4444' }} />
            <h1 className="text-xl font-extrabold mb-2" style={{ color: '#0F172A' }}>Claim Window Expired</h1>
            <p className="text-[14px] mb-6" style={{ color: '#64748B' }}>
              Your 15-minute claim window has passed. The seat has been offered to the next person on the waitlist.
            </p>
            <button className="btn-secondary w-full justify-center" onClick={() => router.push('/events')}>
              Browse Events
            </button>
          </>
        ) : (
          <>
            <div className="relative mx-auto mb-6" style={{ width: 96, height: 96 }}>
              <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={pct > 50 ? '#10b981' : pct > 25 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="3"
                  strokeDasharray={`${pct} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Clock className="h-8 w-8" style={{ color: pct > 50 ? '#10b981' : pct > 25 ? '#f59e0b' : '#ef4444' }} />
              </div>
            </div>

            <h1 className="text-xl font-extrabold mb-2" style={{ color: '#0F172A' }}>A Seat is Available!</h1>
            <p className="text-[14px] mb-2" style={{ color: '#64748B' }}>
              You&apos;ve been promoted from the waitlist. Claim your seat within:
            </p>
            <div className="text-3xl font-extrabold mb-6" style={{ color: pct > 50 ? '#059669' : pct > 25 ? '#d97706' : '#dc2626' }}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>

            <button
              className="btn-primary w-full justify-center"
              onClick={() => holdSeat.mutate()}
              disabled={holdSeat.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              {holdSeat.isPending ? 'Claiming...' : 'Claim My Seat'}
            </button>
            <p className="text-[12px] mt-4" style={{ color: '#94a3b8' }}>
              After claiming, you have 5 minutes to complete registration.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
