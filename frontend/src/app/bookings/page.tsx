'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, CreditCard, Download, Loader2, MapPin, QrCode, Receipt, Ticket, XCircle, Star } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { bookingsApi } from '../../lib/api';
import { downloadBookingReceiptPdf } from '../../lib/pdf';
import { formatCurrency, formatDateTime, getCampusLabel } from '../../lib/utils';

function QRModal({ booking, onClose }: { booking: any; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold" style={{ color: '#0F172A' }}>Your Event Ticket</h3>
          <button onClick={onClose} className="btn-ghost p-2">Close</button>
        </div>
        <div className="text-center">
          <p className="font-semibold text-[14px]" style={{ color: '#0F172A' }}>{booking.event.title}</p>
          <p className="text-[12px] mt-1" style={{ color: '#64748B' }}>{formatDateTime(booking.event.startDateTime)}</p>
          <div className="my-5 flex justify-center">
            {booking.qrCodeUrl ? (
              <img src={booking.qrCodeUrl} alt="QR code" className="h-44 w-44 rounded-2xl border border-slate-200 bg-white p-2" />
            ) : (
              <div className="flex h-44 w-44 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                <QrCode className="h-16 w-16" style={{ color: '#94a3b8' }} />
              </div>
            )}
          </div>
          <div className="rounded-xl px-3 py-2 font-mono text-[12px]" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#1e40af' }}>
            {booking.bookingRef}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function BookingsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => bookingsApi.myBookings().then((res) => res.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.cancel(id).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
      toast.success('Booking cancelled successfully');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not cancel booking'),
  });

  const now = useMemo(() => new Date(), []);
  const grouped = useMemo(() => {
    const upcoming = bookings.filter((booking: any) => booking.status !== 'CANCELLED' && booking.event?.endDateTime && new Date(booking.event.endDateTime) >= now);
    const past = bookings.filter((booking: any) => booking.status !== 'CANCELLED' && booking.event?.endDateTime && new Date(booking.event.endDateTime) < now);
    const cancelled = bookings.filter((booking: any) => booking.status === 'CANCELLED');
    return { upcoming, past, cancelled };
  }, [bookings, now]);

  const tabs = [
    { id: 'upcoming', label: `Upcoming (${grouped.upcoming.length})` },
    { id: 'past', label: `Past (${grouped.past.length})` },
    { id: 'cancelled', label: `Cancelled (${grouped.cancelled.length})` },
  ];

  const current = grouped[activeTab];

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Bookings</div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>My Event Bookings</h1>
          <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>Track registrations, open QR tickets, and download receipts for paid events.</p>
        </div>
        <Link href="/events" className="btn-primary justify-center">
          <Calendar className="h-4 w-4" /> Browse Events
        </Link>
      </div>

      <div className="flex gap-2 rounded-2xl p-1 w-fit" style={{ background: '#F1F5F9' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className="rounded-xl px-4 py-2 text-[13px] font-semibold"
            style={activeTab === tab.id ? { background: '#fff', color: '#0F172A' } : { color: '#64748B' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {isLoading && Array.from({ length: 3 }).map((_, index) => <div key={index} className="skeleton h-36 rounded-3xl" />)}

        {!isLoading && current.length === 0 && (
          <div className="card p-12 text-center">
            <Ticket className="mx-auto h-10 w-10 mb-3" style={{ color: '#94a3b8' }} />
            <div className="font-semibold text-[15px]" style={{ color: '#0F172A' }}>No bookings in this section yet</div>
            <p className="text-[13px] mt-1" style={{ color: '#64748B' }}>Once you register for events, they’ll appear here with seat, payment, and ticket details.</p>
          </div>
        )}

        {!isLoading && current.map((booking: any) => {
          const isPaid = (booking.amountPaid || 0) > 0;
          const canCancel = booking.status === 'CONFIRMED' && booking.event?.startDateTime && new Date(booking.event.startDateTime) > now;

          return (
            <div key={booking.id} className="card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Link href={`/events/${booking.event.slug}`} className="text-[17px] font-extrabold" style={{ color: '#0F172A' }}>
                      {booking.event.title}
                    </Link>
                    <span className={`badge ${booking.status === 'CANCELLED' ? 'badge-red' : booking.checkedIn ? 'badge-blue' : 'badge-green'}`}>
                      {booking.checkedIn ? 'Checked In' : booking.status}
                    </span>
                    {isPaid ? <span className="badge badge-amber">Paid</span> : <span className="badge badge-slate">Free</span>}
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-2" style={{ color: '#64748B' }}>
                    <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {formatDateTime(booking.event.startDateTime)}</div>
                    <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {booking.event.venue} · {getCampusLabel(booking.event.campus)}</div>
                    <div className="flex items-center gap-2"><Receipt className="h-3.5 w-3.5" /> Ref: {booking.bookingRef}</div>
                    {booking.seat && <div className="flex items-center gap-2"><Ticket className="h-3.5 w-3.5" /> Seat {booking.seat.seatNumber} · Row {booking.seat.row}</div>}
                  </div>

                  {isPaid && (
                    <div className="mt-4 rounded-2xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                        <span style={{ color: '#64748B' }}>Payment Status</span>
                        <span className="font-semibold" style={{ color: '#059669' }}>{booking.paymentStatus}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                        <span style={{ color: '#64748B' }}>Total Paid</span>
                        <span className="font-bold" style={{ color: '#0F172A' }}>{formatCurrency(booking.amountPaid || 0)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 lg:w-[220px] lg:justify-end">
                  {booking.qrCodeUrl && booking.status !== 'CANCELLED' && (
                    <button className="btn-secondary text-[12px] py-2" onClick={() => setSelectedBooking(booking)}>
                      <QrCode className="h-3.5 w-3.5" /> View Ticket
                    </button>
                  )}
                  {isPaid && booking.paymentStatus === 'PAID' && (
                    <button className="btn-primary text-[12px] py-2" onClick={() => downloadBookingReceiptPdf(booking)}>
                      <Download className="h-3.5 w-3.5" /> Receipt
                    </button>
                  )}
                  {canCancel && (
                    <button className="btn-danger text-[12px] py-2" onClick={() => cancelMutation.mutate(booking.id)} disabled={cancelMutation.isPending}>
                      {cancelMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                      Cancel
                    </button>
                  )}
                  {isPaid && (
                    <div className="flex items-center gap-1 rounded-xl px-3 py-2 text-[12px] font-semibold" style={{ background: 'rgba(5,150,105,0.08)', color: '#059669' }}>
                      <CreditCard className="h-3.5 w-3.5" /> {formatCurrency(booking.amountPaid || 0)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedBooking && <QRModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />}
      </AnimatePresence>
    </div>
  );
}
