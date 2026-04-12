'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Calendar, CheckCircle2, CreditCard, Download, MapPin, Receipt, Share2, Star, Ticket, Users, Radio, User, ChevronDown, ChevronUp, Wifi, Clock } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { bookingsApi, eventsApi, seatsApi } from '../../../lib/api';
import { downloadBookingReceiptPdf } from '../../../lib/pdf';
import { useAuthStore } from '../../../store/auth.store';
import { SeatMap } from '../../../components/seats/SeatMap';
import { formatCurrency, formatDateTime, formatDate, getCampusColor, getCampusLabel } from '../../../lib/utils';

interface RazorpayOrderResponse {
  orderId: string;
  bookingId: string;
  bookingRef: string;
  keyId: string;
  isMock: boolean;
  mockPaymentId?: string;
  mockSignature?: string;
  amount: {
    base: number;
    gst: number;
    processing: number;
    total: number;
    paise: number;
  };
}

interface RazorpaySuccessPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailurePayload {
  error?: {
    description?: string;
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', handler: (payload: RazorpayFailurePayload) => void) => void;
}

interface RazorpayConstructor {
  new (options: {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    prefill?: {
      name?: string;
      email?: string;
    };
    notes?: Record<string, string>;
    theme?: {
      color: string;
    };
    modal?: {
      ondismiss?: () => void;
    };
    handler: (payload: RazorpaySuccessPayload) => void | Promise<void>;
  }): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

async function loadRazorpayCheckout() {
  if (typeof window === 'undefined') return false;
  if (window.Razorpay) return true;

  return new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function EventDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [holdUntil, setHoldUntil] = useState<string | null>(null);
  const [lastBooking, setLastBooking] = useState<any>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', slug],
    queryFn: () => eventsApi.get(slug).then((res) => res.data),
    enabled: !!slug,
  });

  const eventId = event?.id;

  // Derive sessions from event data
  const sessions = useMemo(() => event?.sessions || [], [event?.sessions]);
  const primarySession = sessions[0];
  const activeSession = useMemo(
    () => (activeSessionId ? sessions.find((s: any) => s.id === activeSessionId) : primarySession),
    [activeSessionId, sessions, primarySession],
  );

  // Use seats from active session
  const seats = useMemo(() => activeSession?.seats || event?.seats || [], [activeSession, event]);
  const bookedSeats = seats.filter((s: any) => s.status === 'BOOKED').length;
  const heldSeats = seats.filter((s: any) => s.status === 'HELD' || s.status === 'LOCKED').length;
  const availableSeats = seats.filter((s: any) => s.status === 'AVAILABLE').length;
  const occupancy = activeSession?.totalSeats
    ? Math.min(((bookedSeats + heldSeats) / activeSession.totalSeats) * 100, 100)
    : 0;
  const selectedSeatLabel = useMemo(() => seats.find((s: any) => s.id === selectedSeat)?.seatNumber, [selectedSeat, seats]);

  // When switching sessions, clear seat selection
  const handleSessionSwitch = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setSelectedSeat(null);
    setHoldUntil(null);
  };

  const holdSeat = useMutation({
    mutationFn: (seatId: string) =>
      seatsApi.holdSeat(eventId, seatId, activeSession?.id).then((res) => res.data),
    onSuccess: (data) => {
      setHoldUntil(data.heldUntil);
      qc.invalidateQueries({ queryKey: ['event', slug] });
      toast.success('Seat reserved temporarily. Complete payment to secure it.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not hold seat'),
  });

  const freeBooking = useMutation({
    mutationFn: () =>
      bookingsApi.bookFree(activeSession?.id || primarySession?.id, selectedSeat || undefined).then((res) => res.data),
    onSuccess: (data) => {
      setLastBooking(data);
      qc.invalidateQueries({ queryKey: ['event', slug] });
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
      toast.success('You are registered for this event');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not complete registration'),
  });

  const paidBooking = useMutation({
    mutationFn: async () => {
      const sessionId = activeSession?.id || primarySession?.id;
      const order: RazorpayOrderResponse = await bookingsApi
        .createOrder(sessionId, selectedSeat || undefined)
        .then((res) => res.data);

      if (order.isMock) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        return bookingsApi.verifyPayment({
          bookingId: order.bookingId,
          razorpayOrderId: order.orderId,
          razorpayPaymentId: order.mockPaymentId || `manual_${order.bookingId.slice(0, 8)}`,
          razorpaySignature: order.mockSignature || '',
        }).then((res) => res.data);
      }

      const checkoutLoaded = await loadRazorpayCheckout();
      if (!checkoutLoaded || !window.Razorpay) {
        throw new Error('Razorpay checkout could not be loaded. Check your connection and try again.');
      }

      return new Promise((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: order.keyId,
          amount: order.amount.paise,
          currency: 'INR',
          name: 'VITVerse',
          description: `Registration for ${event.title}`,
          order_id: order.orderId,
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          notes: {
            bookingId: order.bookingId,
            eventId: event.id,
            sessionId: sessionId || '',
          },
          theme: {
            color: '#0052CC',
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
          handler: async (payload) => {
            try {
              const verified = await bookingsApi.verifyPayment({
                bookingId: order.bookingId,
                razorpayOrderId: payload.razorpay_order_id,
                razorpayPaymentId: payload.razorpay_payment_id,
                razorpaySignature: payload.razorpay_signature,
              }).then((res) => res.data);
              resolve(verified);
            } catch (error) {
              reject(error);
            }
          },
        });

        razorpay.on('payment.failed', (payload) => {
          reject(new Error(payload.error?.description || 'Razorpay payment failed'));
        });

        razorpay.open();
      });
    },
    onSuccess: (data: any) => {
      setLastBooking(data);
      setHoldUntil(null);
      qc.invalidateQueries({ queryKey: ['event', slug] });
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
      toast.success(data?.paymentStatus === 'PAID' ? 'Payment completed and booking confirmed' : 'Booking confirmed');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Payment failed'),
  });

  const joinWaitlist = useMutation({
    mutationFn: () => seatsApi.joinWaitlist(eventId, activeSession?.id).then((res) => res.data),
    onSuccess: () => toast.success('Added to waitlist successfully'),
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not join waitlist'),
  });

  if (isLoading) return <div className="skeleton h-[420px] rounded-3xl" />;
  if (!event) return <div className="card p-8">Event not found.</div>;

  const campusColor = getCampusColor(event.campus);
  const isSoldOut = availableSeats === 0 && (activeSession?.totalSeats || 0) > 0;
  const requiresSeat = seats.length > 0;
  const hasMultipleSessions = sessions.length > 1;

  const handleRegister = () => {
    if (!user) { router.push('/auth/login'); return; }
    if (!activeSession && !primarySession) {
      toast.error('No bookable session is available right now'); return;
    }
    if (requiresSeat && !selectedSeat) { toast.error('Please select a seat first'); return; }
    if (event.entryFee > 0) { paidBooking.mutate(); } else { freeBooking.mutate(); }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="btn-ghost -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Hero */}
      <section className="overflow-hidden rounded-[28px]" style={{ background: '#0F172A' }}>
        <div className="relative h-[320px]">
          {event.posterUrl ? (
            <img src={event.posterUrl} alt={event.title} className="h-full w-full object-cover opacity-70" />
          ) : (
            <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${campusColor}, #0F172A)` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="badge badge-blue">{getCampusLabel(event.campus)}</span>
              {event.entryFee > 0 ? <span className="badge badge-amber">{formatCurrency(event.entryFee)}</span> : <span className="badge badge-green">Free Entry</span>}
              {event.certificateEligible && <span className="badge badge-slate">Certificate</span>}
              {hasMultipleSessions && <span className="badge badge-slate">{sessions.length} Sessions</span>}
            </div>
            <h1 className="max-w-3xl text-4xl font-extrabold text-white md:text-5xl">{event.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">{event.shortDesc || event.description}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          {/* Info grid */}
          <section className="card p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { icon: Calendar, label: 'Date & Time', value: formatDateTime(event.startDateTime) },
                { icon: MapPin, label: 'Venue', value: activeSession?.venue?.name || event.venue || 'TBA' },
                { icon: Users, label: 'Hosted For', value: getCampusLabel(event.campus) },
                { icon: Star, label: 'Rewards', value: `${event.points} points${event.prizePool ? ` | ${event.prizePool}` : ''}` },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                    <item.icon className="h-3.5 w-3.5" /> {item.label}
                  </div>
                  <div className="mt-2 text-[14px] font-semibold" style={{ color: '#0F172A' }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-extrabold mb-3" style={{ color: '#0F172A' }}>Event Description</h2>
              <p className="text-[14px] leading-7 whitespace-pre-wrap" style={{ color: '#475569' }}>{event.description || 'More details will be announced soon.'}</p>
            </div>
          </section>

          {/* Sessions agenda, shown for multi-session events or speaker info */}
          {sessions.length > 0 && (
            <section className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-extrabold" style={{ color: '#0F172A' }}>
                  {hasMultipleSessions ? 'Sessions / Schedule' : 'Session Details'}
                </h2>
                {hasMultipleSessions && sessions.length > 3 && (
                  <button className="btn-ghost text-[13px]" onClick={() => setShowAllSessions(!showAllSessions)}>
                    {showAllSessions ? <><ChevronUp className="h-4 w-4" /> Show less</> : <><ChevronDown className="h-4 w-4" /> All {sessions.length} sessions</>}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {(showAllSessions ? sessions : sessions.slice(0, 3)).map((session: any) => {
                  const isActive = (activeSession?.id || primarySession?.id) === session.id;
                  return (
                    <div
                      key={session.id}
                      onClick={() => hasMultipleSessions && handleSessionSwitch(session.id)}
                      className="rounded-2xl p-4 transition-all"
                      style={{
                        background: isActive ? 'rgba(30,64,175,0.06)' : '#F8FAFC',
                        border: isActive ? '1.5px solid rgba(30,64,175,0.25)' : '1px solid #E2E8F0',
                        cursor: hasMultipleSessions ? 'pointer' : 'default',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-bold" style={{ color: '#0F172A' }}>
                              {session.title || 'Main Session'}
                            </span>
                            {isActive && hasMultipleSessions && (
                              <span className="badge badge-blue text-[10px]">Selected</span>
                            )}
                            {session.streamUrl && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#7c3aed' }}>
                                <Radio className="h-3 w-3" /> Live Stream
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1.5 text-[12px]" style={{ color: '#64748B' }}>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {formatDate(session.sessionDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {session.startTime} - {session.endTime}
                            </span>
                            {session.venue?.name && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {session.venue.name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {session.totalSeats} seats
                            </span>
                          </div>
                        </div>
                        {session.speakerName && (
                          <div className="flex items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                            <User className="h-3.5 w-3.5" style={{ color: '#6366f1' }} />
                            <div>
                              <div className="text-[12px] font-semibold" style={{ color: '#4338ca' }}>{session.speakerName}</div>
                              {session.speakerBio && (
                                <div className="text-[11px]" style={{ color: '#6366f1' }}>{session.speakerBio.slice(0, 60)}{session.speakerBio.length > 60 ? '...' : ''}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {session.streamUrl && (
                        <div className="mt-2">
                          <a href={session.streamUrl} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: '#7c3aed' }}
                            onClick={(e) => e.stopPropagation()}>
                            <Wifi className="h-3.5 w-3.5" /> Join Live Stream
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Seat map */}
          {requiresSeat && (
            <section className="card p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-extrabold" style={{ color: '#0F172A' }}>Seat Availability</h2>
                  <p className="text-[13px] mt-1" style={{ color: '#64748B' }}>
                    {hasMultipleSessions ? `Showing seats for: ${activeSession?.title || 'Main Session'}` : 'Choose your seat before confirming registration.'}
                  </p>
                </div>
                {selectedSeatLabel && (
                  <div className="badge badge-blue">Selected: {selectedSeatLabel}</div>
                )}
              </div>

              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                  <span>Occupied vs Available</span>
                  <span>{bookedSeats + heldSeats} / {activeSession?.totalSeats || event.capacity}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full" style={{ background: '#E2E8F0' }}>
                  <div className="h-full rounded-full" style={{ width: `${occupancy}%`, background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 40%, #10b981 100%)' }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-[12px]" style={{ color: '#64748B' }}>
                  <span>Available: <strong style={{ color: '#059669' }}>{availableSeats}</strong></span>
                  <span>Occupied: <strong style={{ color: '#ef4444' }}>{bookedSeats}</strong></span>
                  <span>Held: <strong style={{ color: '#d97706' }}>{heldSeats}</strong></span>
                </div>
              </div>

              <SeatMap
                eventId={event.id}
                sessionId={activeSession?.id}
                seats={seats}
                selectedSeatId={selectedSeat}
                onSelect={setSelectedSeat}
              />
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-xl font-extrabold mb-4" style={{ color: '#0F172A' }}>Registration</h2>

            {hasMultipleSessions && (
              <div className="mb-4 rounded-2xl p-3" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                <p className="text-[12px] font-semibold" style={{ color: '#0369a1' }}>
                  Booking for: {activeSession?.title || 'Main Session'} | {formatDate(activeSession?.sessionDate || primarySession?.sessionDate)}
                </p>
              </div>
            )}

            <div className="space-y-3 rounded-3xl p-5 mb-5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="flex items-center justify-between text-[13px]">
                <span style={{ color: '#64748B' }}>Ticket Price</span>
                <strong style={{ color: '#0F172A' }}>{formatCurrency(event.entryFee || 0)}</strong>
              </div>
              {event.entryFee > 0 && (
                <>
                  <div className="flex items-center justify-between text-[13px]">
                    <span style={{ color: '#64748B' }}>GST</span>
                    <strong style={{ color: '#0F172A' }}>{formatCurrency((event.entryFee || 0) * 0.18)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span style={{ color: '#64748B' }}>Platform Fee</span>
                    <strong style={{ color: '#0F172A' }}>{formatCurrency(20)}</strong>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between text-[13px]">
                <span style={{ color: '#64748B' }}>Selected Seat</span>
                <strong style={{ color: '#0F172A' }}>{selectedSeatLabel || (requiresSeat ? 'Not selected' : 'Open seating')}</strong>
              </div>
              {event.entryFee > 0 && (
                <div className="flex items-center justify-between text-[13px] pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#64748B' }}>Payable Now</span>
                  <strong style={{ color: '#0F172A' }}>{formatCurrency((event.entryFee || 0) * 1.18 + 20)}</strong>
                </div>
              )}
              {holdUntil && (
                <div className="rounded-2xl px-3 py-2 text-[12px]" style={{ background: 'rgba(217,119,6,0.08)', color: '#b45309' }}>
                  Seat held until {new Date(holdUntil).toLocaleTimeString()}
                </div>
              )}
              {event.entryFee > 0 && (
                <div className="rounded-2xl px-3 py-2 text-[12px]" style={{ background: 'rgba(37,99,235,0.08)', color: '#1d4ed8' }}>
                  Secure checkout will open in Razorpay to complete your booking.
                </div>
              )}
            </div>

            {requiresSeat && selectedSeat && !holdUntil && (
              <button className="btn-secondary w-full justify-center mb-3" onClick={() => holdSeat.mutate(selectedSeat)} disabled={holdSeat.isPending}>
                {holdSeat.isPending ? 'Holding seat...' : `Hold seat ${selectedSeatLabel}`}
              </button>
            )}

            {!isSoldOut ? (
              <button
                className="btn-primary w-full justify-center"
                onClick={handleRegister}
                disabled={freeBooking.isPending || paidBooking.isPending || (requiresSeat && !selectedSeat)}
              >
                {event.entryFee > 0 ? <CreditCard className="h-4 w-4" /> : <Ticket className="h-4 w-4" />}
                {freeBooking.isPending || paidBooking.isPending ? 'Processing...' : event.entryFee > 0 ? 'Pay and Register' : 'Register Now'}
              </button>
            ) : (
              <button className="btn-secondary w-full justify-center" onClick={() => joinWaitlist.mutate()} disabled={joinWaitlist.isPending}>
                Join Waitlist
              </button>
            )}

            <button
              className="btn-ghost w-full justify-center mt-3 border border-slate-200"
              onClick={async () => { await navigator.clipboard.writeText(window.location.href); toast.success('Event link copied'); }}
            >
              <Share2 className="h-4 w-4" /> Share Event
            </button>
          </section>

          <AnimatePresence>
            {lastBooking && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(5,150,105,0.08)' }}>
                    <CheckCircle2 className="h-5 w-5" style={{ color: '#059669' }} />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold" style={{ color: '#0F172A' }}>Booking Confirmed</h3>
                    <p className="text-[12px]" style={{ color: '#64748B' }}>Your registration is complete.</p>
                  </div>
                </div>
                <div className="space-y-2 text-[13px] mb-4">
                  <div><span style={{ color: '#64748B' }}>Reference:</span> <strong>{lastBooking.bookingRef}</strong></div>
                  <div><span style={{ color: '#64748B' }}>Payment:</span> <strong>{lastBooking.paymentStatus}</strong></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/bookings" className="btn-primary justify-center">
                    <Ticket className="h-4 w-4" /> My Bookings
                  </Link>
                  {lastBooking.paymentStatus === 'PAID' && (
                    <button className="btn-secondary justify-center" onClick={() => downloadBookingReceiptPdf(lastBooking)}>
                      <Download className="h-4 w-4" /> Download Receipt
                    </button>
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          <section className="card p-6">
            <h3 className="text-[16px] font-bold mb-3" style={{ color: '#0F172A' }}>What&apos;s included</h3>
            <div className="space-y-3 text-[13px]" style={{ color: '#64748B' }}>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Instant confirmation after registration</div>
              <div className="flex items-center gap-2"><Receipt className="h-4 w-4 text-blue-600" /> Downloadable receipt for paid events</div>
              <div className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" /> Platform points and certificate eligibility</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
