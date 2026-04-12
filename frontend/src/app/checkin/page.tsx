'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, XCircle, QrCode, User, MapPin, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingsApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { getCampusLabel, formatDate } from '../../lib/utils';

export default function CheckInPage() {
  const { user } = useAuthStore();
  const [qrInput, setQrInput] = useState('');
  const [result, setResult] = useState<any>(null);

  const checkIn = useMutation({
    mutationFn: (qrToken: string) => bookingsApi.checkIn(qrToken).then(r => r.data),
    onSuccess: (data) => {
      setResult(data);
      setQrInput('');
      if (data.alreadyCheckedIn) {
        toast.error('Already checked in earlier');
      } else {
        toast.success(`Welcome, ${data.user?.name}!`);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Invalid QR code');
      setResult(null);
    },
  });

  if (!user || !['FACULTY', 'SUPER_ADMIN', 'CLUB_PRESIDENT'].includes(user.role)) {
    return (
      <div className="card p-8 text-center">
        <p style={{ color: '#64748B' }}>Only organizers can access the check-in scanner.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>Event Check-In</h1>
        <p className="text-[14px] mt-1" style={{ color: '#64748B' }}>Scan or paste a QR token to check in attendees</p>
      </div>

      <section className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: '#F0F9FF' }}>
            <QrCode className="h-5 w-5" style={{ color: '#0369a1' }} />
          </div>
          <div>
            <h2 className="text-[16px] font-bold" style={{ color: '#0F172A' }}>QR Token</h2>
            <p className="text-[12px]" style={{ color: '#64748B' }}>Paste the token from the attendee&apos;s booking QR</p>
          </div>
        </div>

        <textarea
          className="w-full rounded-xl p-3 text-[13px] font-mono resize-none"
          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A', minHeight: 80 }}
          placeholder="Paste QR token here..."
          value={qrInput}
          onChange={e => setQrInput(e.target.value)}
        />

        <button
          className="btn-primary w-full justify-center mt-3"
          onClick={() => qrInput.trim() && checkIn.mutate(qrInput.trim())}
          disabled={!qrInput.trim() || checkIn.isPending}
        >
          {checkIn.isPending ? 'Checking in...' : 'Check In Attendee'}
        </button>
      </section>

      {result && (
        <section className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: result.alreadyCheckedIn ? 'rgba(239,68,68,0.08)' : 'rgba(5,150,105,0.08)' }}>
              {result.alreadyCheckedIn
                ? <XCircle className="h-5 w-5" style={{ color: '#dc2626' }} />
                : <CheckCircle2 className="h-5 w-5" style={{ color: '#059669' }} />}
            </div>
            <div>
              <h3 className="text-[16px] font-bold" style={{ color: '#0F172A' }}>
                {result.alreadyCheckedIn ? 'Already Checked In' : `Welcome, ${result.user?.name}!`}
              </h3>
              <p className="text-[12px]" style={{ color: '#64748B' }}>{result.message}</p>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div className="flex items-center gap-2 text-[13px]">
              <User className="h-4 w-4" style={{ color: '#64748B' }} />
              <span style={{ color: '#64748B' }}>Name:</span>
              <strong style={{ color: '#0F172A' }}>{result.user?.name}</strong>
              {result.user?.regNumber && <span style={{ color: '#94a3b8' }}>({result.user.regNumber})</span>}
            </div>
            {result.event && (
              <div className="flex items-center gap-2 text-[13px]">
                <Ticket className="h-4 w-4" style={{ color: '#64748B' }} />
                <span style={{ color: '#64748B' }}>Event:</span>
                <strong style={{ color: '#0F172A' }}>{result.event?.title}</strong>
              </div>
            )}
            {result.event?.campus && (
              <div className="flex items-center gap-2 text-[13px]">
                <MapPin className="h-4 w-4" style={{ color: '#64748B' }} />
                <span style={{ color: '#64748B' }}>Campus:</span>
                <strong style={{ color: '#0F172A' }}>{getCampusLabel(result.event.campus)}</strong>
              </div>
            )}
            {result.seat && (
              <div className="flex items-center gap-2 text-[13px]">
                <span style={{ color: '#64748B' }}>Seat:</span>
                <strong style={{ color: '#0F172A' }}>{result.seat.seatNumber}</strong>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
