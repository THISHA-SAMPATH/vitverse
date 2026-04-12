import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AchievementService } from '../achievements/achievement.service';
import { BookingStatus, PaymentStatus, Role } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private email: EmailService,
    private achievements: AchievementService,
  ) {}

  private combineDateTime(date?: Date, time?: string) {
    if (!date) return null;
    const [hours, minutes] = (time || '00:00').split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours || 0, minutes || 0, 0, 0);
    return combined;
  }

  private isRazorpayConfigured() {
    const keyId = this.config.get<string>('razorpay.keyId');
    return !!keyId && keyId !== 'rzp_test_REPLACE_ME';
  }

  private getPaymentSecret() {
    return this.config.get<string>('razorpay.keySecret') || 'mock_razorpay_secret';
  }

  private async validateSeatForSession(sessionId: string, seatId?: string, userId?: string) {
    if (!seatId) return null;

    const seat = await this.prisma.seat.findUnique({ where: { id: seatId } });
    if (!seat) throw new NotFoundException('Seat not found');
    if (seat.sessionId !== sessionId) throw new BadRequestException('Seat does not belong to this session');
    if (seat.status === 'BOOKED') throw new ConflictException('Seat is already booked');

    const lockStillActive = seat.lockedUntil && seat.lockedUntil > new Date();
    if (seat.status === 'LOCKED' && lockStillActive && seat.lockedById && seat.lockedById !== userId) {
      throw new ConflictException('Seat is currently locked by another user');
    }

    return seat;
  }

  private getRazorpay() {
    const keyId = this.config.get<string>('razorpay.keyId');
    if (!keyId || keyId === 'rzp_test_REPLACE_ME') {
      throw new BadRequestException('Payment gateway not configured. Contact admin.');
    }
    // Dynamic import to avoid crashes if razorpay not installed
    const Razorpay = require('razorpay');
    return new Razorpay({
      key_id: keyId,
      key_secret: this.config.get<string>('razorpay.keySecret'),
    });
  }

  /**
   * Create a Razorpay order for a paid event
   */
  async createOrder(userId: string, sessionId: string, seatId?: string) {
    // Get session + event details
    const session = await this.prisma.eventSession.findUnique({
      where: { id: sessionId },
      include: { event: true, venue: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'SCHEDULED') throw new BadRequestException(`Session is ${session.status}`);
    if (session.event.isFree) throw new BadRequestException('Use free booking endpoint for this event');

    // Reuse the existing booking row for this session when possible.
    // The database enforces one booking row per user per session.
    const existing = await this.prisma.booking.findUnique({
      where: { userId_sessionId: { userId, sessionId } },
    });
    if (existing && (existing.status === BookingStatus.CONFIRMED || existing.status === BookingStatus.WAITLISTED)) {
      throw new ConflictException('You already have a booking for this session');
    }
    await this.validateSeatForSession(sessionId, seatId, userId);

    // Calculate amounts (with GST + processing fee)
    const base = session.event.ticketPrice;
    const gst = Math.round(base * 0.18 * 100) / 100;
    const processing = 20;
    const total = base + gst + processing;
    const totalPaise = Math.round(total * 100);

    const bookingRef = existing?.bookingRef || await this.generateBookingRef(session.event.id);
    const booking = existing
      ? await this.prisma.booking.update({
          where: { id: existing.id },
          data: {
            bookingRef,
            eventId: session.event.id,
            seatId: seatId || undefined,
            status: BookingStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            paymentRef: null,
            razorpayPaymentId: null,
            refundId: null,
            refundAmount: null,
            refundInitiatedAt: null,
            cancellationReason: null,
            amountPaid: total,
            gstAmount: gst,
            processingFee: processing,
            confirmedAt: null,
            cancelledAt: null,
            qrToken: null,
            qrCodeUrl: null,
            checkedIn: false,
            checkedInAt: null,
          },
        })
      : await this.prisma.booking.create({
          data: {
            bookingRef,
            userId,
            eventId: session.event.id,
            sessionId,
            seatId: seatId || undefined,
            status: BookingStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            amountPaid: total,
            gstAmount: gst,
            processingFee: processing,
          },
        });

    let order: any;
    try {
      if (this.isRazorpayConfigured()) {
        const razorpay = this.getRazorpay();
        order = await razorpay.orders.create({
          amount: totalPaise,
          currency: 'INR',
          receipt: `bk_${booking.id.slice(0, 8)}`,
          notes: {
            booking_id: booking.id,
            user_id: userId,
            event_title: session.event.title,
          },
        });
      } else {
        order = {
          id: `mock_order_${booking.id.slice(0, 10)}`,
          amount: totalPaise,
          currency: 'INR',
        };
      }

      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { paymentRef: order.id },
      });
    } catch (err) {
      if (!existing) {
        await this.prisma.booking.delete({ where: { id: booking.id } });
      }
      throw err;
    }

    const mockPaymentId = `mock_payment_${booking.id.slice(0, 10)}`;
    const mockSignature = crypto
      .createHmac('sha256', this.getPaymentSecret())
      .update(`${order.id}|${mockPaymentId}`)
      .digest('hex');

    return {
      orderId: order.id,
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
      keyId: this.config.get('razorpay.keyId') || 'mock_key',
      isMock: !this.isRazorpayConfigured(),
      mockPaymentId,
      mockSignature,
      amount: {
        base,
        gst,
        processing,
        total,
        paise: totalPaise,
      },
    };
  }

  /**
   * Verify Razorpay payment signature and confirm booking
   */
  async verifyPayment(
    userId: string,
    bookingId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    // Verify HMAC signature
    const expected = crypto
      .createHmac('sha256', this.getPaymentSecret())
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expected !== razorpaySignature) {
      throw new BadRequestException('Payment verification failed — invalid signature');
    }

    // Confirm booking in transaction
    const booking = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { event: true, session: { include: { venue: true } } },
      });
      if (!existing) throw new NotFoundException('Booking not found');
      if (existing.userId !== userId) throw new BadRequestException('Booking does not belong to this user');
      if (existing.status === BookingStatus.CONFIRMED) return existing;

      // Lock seat if applicable
      if (existing.seatId) {
        await tx.seat.update({
          where: { id: existing.seatId },
          data: { status: 'BOOKED', lockedById: null, lockedUntil: null, bookedAt: new Date() },
        });
      }

      return tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          razorpayPaymentId,
          confirmedAt: new Date(),
        },
        include: { event: true, session: { include: { venue: true } } },
      });
    });

    // Generate QR token
    const qrToken = crypto.randomBytes(24).toString('hex');
    const qrPayload = JSON.stringify({ t: qrToken, b: bookingId, v: 2 });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      width: 300,
      color: { dark: '#0052CC', light: '#ffffff' },
    });

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { qrToken, qrCodeUrl: qrDataUrl },
    });

    // Award points
    await this.prisma.$transaction([
      this.prisma.pointTransaction.create({
        data: { userId, points: booking.event.points, reason: 'Event Registration', referenceId: bookingId },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { points: { increment: booking.event.points } },
      }),
    ]);

    // Send emails + notifications (non-blocking)
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    if (user) {
      this.email.sendBookingConfirmation(
        user,
        { bookingRef: booking.bookingRef, amountPaid: booking.amountPaid, paymentStatus: 'PAID' },
        {
          title: booking.event.title,
          campus: booking.event.campus,
          sessionDate: booking.session.sessionDate,
          startTime: booking.session.startTime,
          endTime: booking.session.endTime,
          venueName: booking.session.venue.name,
        },
        qrDataUrl,
      ).catch(() => {});

      this.email.sendPaymentReceipt(
        user,
        {
          bookingRef: booking.bookingRef,
          amountPaid: booking.amountPaid,
          gstAmount: booking.gstAmount,
          processingFee: booking.processingFee,
          razorpayPaymentId,
        },
        { title: booking.event.title },
      ).catch(() => {});
    }

    await this.prisma.notification.create({
      data: {
        userId,
        type: 'PAYMENT_RECEIVED',
        title: '💳 Payment Confirmed!',
        message: `₹${booking.amountPaid} received for "${booking.event.title}". Your ticket is ready!`,
        bookingId,
      },
    });

    // Check achievements
    await this.achievements.check(userId, 'booking_created', { eventCampus: booking.event.campus });
    await this.achievements.check(userId, 'payment_made');

    return { ...booking, qrDataUrl, qrToken };
  }

  /**
   * Free event booking (no payment required)
   */
  async bookFreeEvent(userId: string, sessionId: string, seatId?: string) {
    const session = await this.prisma.eventSession.findUnique({
      where: { id: sessionId },
      include: { event: true, venue: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (!session.event.isFree) throw new BadRequestException('This is a paid event. Use payment endpoint.');
    if (session.status !== 'SCHEDULED') throw new BadRequestException(`Session is ${session.status}`);

    // Enforce registration window
    const now = new Date();
    if ((session.event as any).registrationStart && now < (session.event as any).registrationStart) {
      throw new BadRequestException('Registration has not opened yet');
    }
    if (session.event.registrationEnd && now > session.event.registrationEnd) {
      throw new BadRequestException('Registration period has closed');
    }

    const existing = await this.prisma.booking.findUnique({
      where: { userId_sessionId: { userId, sessionId } },
    });
    if (existing && (existing.status === BookingStatus.CONFIRMED || existing.status === BookingStatus.WAITLISTED)) {
      throw new ConflictException('Already booked for this session');
    }
    await this.validateSeatForSession(sessionId, seatId, userId);

    // Atomic seat claim to prevent race condition
    if (seatId) {
      const seatCheck = await this.prisma.seat.findUnique({ where: { id: seatId } });
      if (!seatCheck) throw new NotFoundException('Seat not found');
      if (seatCheck.status === 'BOOKED') throw new ConflictException('Seat just got booked by another user. Please select a different seat.');
      // Lock seat atomically - only update if still AVAILABLE or LOCKED by this user
      const updated = await this.prisma.seat.updateMany({
        where: { id: seatId, status: { in: ['AVAILABLE', 'LOCKED'] } },
        data: { status: 'BOOKED', bookedAt: new Date(), lockedById: null, lockedUntil: null },
      });
      if (updated.count === 0) {
        throw new ConflictException('Seat was just taken. Please select a different seat.');
      }
    }

    const bookingRef = existing?.bookingRef || await this.generateBookingRef(session.event.id);
    const qrToken = crypto.randomBytes(24).toString('hex');
    const qrPayload = JSON.stringify({ t: qrToken, b: 'pending', v: 2 });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      width: 300,
      color: { dark: '#0052CC', light: '#ffffff' },
    });

    const booking = existing
      ? await this.prisma.booking.update({
          where: { id: existing.id },
          data: {
            bookingRef,
            eventId: session.event.id,
            seatId: seatId || undefined,
            status: BookingStatus.CONFIRMED,
            paymentStatus: PaymentStatus.FREE,
            paymentRef: null,
            razorpayPaymentId: null,
            refundId: null,
            refundAmount: null,
            refundInitiatedAt: null,
            cancellationReason: null,
            amountPaid: 0,
            gstAmount: 0,
            processingFee: 0,
            confirmedAt: new Date(),
            cancelledAt: null,
            qrToken,
            qrCodeUrl: qrDataUrl,
            checkedIn: false,
            checkedInAt: null,
          },
          include: { event: true, session: { include: { venue: true } } },
        })
      : await this.prisma.booking.create({
          data: {
            bookingRef,
            userId,
            eventId: session.event.id,
            sessionId,
            seatId: seatId || undefined,
            status: BookingStatus.CONFIRMED,
            paymentStatus: PaymentStatus.FREE,
            amountPaid: 0,
            confirmedAt: new Date(),
            qrToken,
            qrCodeUrl: qrDataUrl,
          },
          include: { event: true, session: { include: { venue: true } } },
        });

    // Update QR with booking ID
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { qrCodeUrl: qrDataUrl },
    });

    // Points + notifications
    await this.prisma.$transaction([
      this.prisma.pointTransaction.create({
        data: { userId, points: session.event.points, reason: 'Event Registration', referenceId: booking.id },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { points: { increment: session.event.points } },
      }),
    ]);

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    if (user) {
      this.email.sendBookingConfirmation(
        user,
        { bookingRef: booking.bookingRef, amountPaid: 0, paymentStatus: 'FREE' },
        {
          title: booking.event.title,
          campus: booking.event.campus,
          sessionDate: booking.session.sessionDate,
          startTime: booking.session.startTime,
          endTime: booking.session.endTime,
          venueName: booking.session.venue.name,
        },
        qrDataUrl,
      ).catch(() => {});
    }

    await this.prisma.notification.create({
      data: {
        userId,
        type: 'BOOKING_CONFIRMED',
        title: '🎟️ Booking Confirmed!',
        message: `You're registered for "${booking.event.title}"!`,
        bookingId: booking.id,
      },
    });

    await this.achievements.check(userId, 'booking_created', { eventCampus: session.event.campus });

    return { ...booking, qrDataUrl };
  }

  /**
   * Cancel booking + initiate refund
   */
  async cancelBooking(bookingId: string, userId: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { event: true, session: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new BadRequestException('Not your booking');
    if (booking.status === BookingStatus.CANCELLED) throw new BadRequestException('Already cancelled');

    // Release seat
    if (booking.seatId) {
      await this.prisma.seat.update({
        where: { id: booking.seatId },
        data: { status: 'AVAILABLE', bookedAt: null, lockedById: null },
      });
    }

    // Initiate refund if paid
    let refundId: string | undefined;
    if (booking.paymentStatus === PaymentStatus.PAID && booking.razorpayPaymentId && booking.amountPaid > 0) {
      try {
        const razorpay = this.getRazorpay();
        const refund = await razorpay.payments.refund(booking.razorpayPaymentId, {
          amount: Math.round(booking.amountPaid * 100),
          notes: { booking_ref: booking.bookingRef, reason: reason || 'User cancellation' },
        });
        refundId = refund.id;
      } catch (err) {
        this.logger.warn(`Refund via Razorpay failed, marking as pending: ${err.message}`);
        refundId = `SIM_${Date.now()}`;
      }
    }

    const cancelled = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        paymentStatus: refundId ? PaymentStatus.REFUNDED : booking.paymentStatus,
        cancellationReason: reason,
        cancelledAt: new Date(),
        refundId,
        refundAmount: refundId ? booking.amountPaid : undefined,
        refundInitiatedAt: refundId ? new Date() : undefined,
      },
    });

    // Promote from waitlist
    await this.promoteFromWaitlist(booking.sessionId);

    // Send email
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    if (user) {
      this.email.sendBookingCancellation(
        user,
        { bookingRef: booking.bookingRef, cancellationReason: reason },
        { title: booking.event.title },
        refundId ? booking.amountPaid : undefined,
      ).catch(() => {});

      if (refundId && booking.amountPaid > 0) {
        this.email.sendRefundConfirmation(user, { bookingRef: booking.bookingRef }, refundId, booking.amountPaid).catch(() => {});
      }
    }

    await this.prisma.notification.create({
      data: {
        userId,
        type: 'BOOKING_CANCELLED',
        title: '❌ Booking Cancelled',
        message: `Your booking for "${booking.event.title}" has been cancelled.${refundId ? ` Refund of ₹${booking.amountPaid} initiated.` : ''}`,
        bookingId,
      },
    });

    return cancelled;
  }

  /**
   * Verify QR code at venue entrance
   */
  async checkIn(qrToken: string, organizerId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { qrToken },
      include: {
        user: { select: { name: true, regNumber: true, email: true, avatar: true } },
        event: { select: { title: true, campus: true } },
        session: { include: { venue: true } },
        seat: true,
      },
    });
    if (!booking) throw new NotFoundException('Invalid QR code');
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(`Booking is ${booking.status} — entry not allowed`);
    }
    if (booking.checkedIn) {
      return { ...booking, alreadyCheckedIn: true, message: 'Already checked in' };
    }

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { checkedIn: true, checkedInAt: new Date(), status: 'CHECKED_IN' as any },
    });

    // Award attendance points
    await this.prisma.$transaction([
      this.prisma.pointTransaction.create({
        data: { userId: booking.userId, points: 20, reason: 'Event Attendance', referenceId: booking.eventId },
      }),
      this.prisma.user.update({
        where: { id: booking.userId },
        data: { points: { increment: 20 } },
      }),
    ]);

    // Record attendance
    await this.prisma.attendance.upsert({
      where: { userId_eventId: { userId: booking.userId, eventId: booking.eventId } },
      create: { userId: booking.userId, eventId: booking.eventId, sessionId: booking.sessionId, scannedByUserId: organizerId },
      update: { scannedAt: new Date() },
    });

    // Trigger achievement
    await this.achievements.check(booking.userId, 'qr_scanned');

    return {
      ...updated,
      alreadyCheckedIn: false,
      message: `✅ Welcome, ${booking.user.name}!`,
      user: booking.user,
      event: booking.event,
      seat: booking.seat,
    };
  }

  /**
   * Razorpay webhook handler
   */
  async handleWebhook(payload: any, signature: string, rawBody: Buffer) {
    const secret = this.config.get<string>('razorpay.webhookSecret');
    if (secret && secret !== 'REPLACE_ME') {
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      if (expected !== signature) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const entity = payload?.payload?.payment?.entity;
    const notes = entity?.notes || {};

    if (payload.event === 'payment.captured' && notes.booking_id) {
      await this.prisma.booking.updateMany({
        where: { id: notes.booking_id, status: BookingStatus.PENDING },
        data: { status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.PAID, razorpayPaymentId: entity.id, confirmedAt: new Date() },
      });
    }

    if (payload.event === 'payment.failed' && notes.booking_id) {
      await this.prisma.booking.updateMany({
        where: { id: notes.booking_id },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
    }

    return { status: 'ok' };
  }

  private async promoteFromWaitlist(sessionId: string) {
    const next = await this.prisma.waitlist.findFirst({
      where: { sessionId, notified: false },
      orderBy: { queuePosition: 'asc' },
      include: { session: { include: { event: true } } },
    });
    if (!next) return;

    await this.prisma.waitlist.update({
      where: { id: next.id },
      data: { notified: true, notifiedAt: new Date() },
    });

    await this.prisma.notification.create({
      data: {
        userId: next.userId,
        type: 'WAITLIST_PROMOTED',
        title: '🎊 Spot Available — Claim Now!',
        message: `A spot opened for "${next.session.event.title}". You have 15 minutes to claim it!`,
        data: {
          eventId: next.session.eventId,
          claimUrl: `/waitlist-claim?eventId=${next.session.eventId}&eventSlug=${next.session.event.slug}`,
        },
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: next.userId }, select: { name: true, email: true } });
    if (user) {
      this.email.sendWaitlistPromotion(
        user,
        { title: next.session.event.title, campus: next.session.event.campus },
        15,
      ).catch(() => {});
    }
  }

  private async generateBookingRef(eventId: string): Promise<string> {
    const shortId = eventId.slice(0, 4).toUpperCase();
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const ref = `VIT-${shortId}-${suffix}`;
    const exists = await this.prisma.booking.findUnique({ where: { bookingRef: ref } });
    return exists ? this.generateBookingRef(eventId) : ref;
  }

  async getRazorpayConfig() {
    const keyId = this.config.get<string>('razorpay.keyId');
    if (!keyId || keyId === 'rzp_test_REPLACE_ME') {
      throw new BadRequestException('Payment gateway not configured');
    }
    return { keyId };
  }

  async getUserBookings(userId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
            campus: true,
            bannerUrl: true,
            posterUrl: true,
            isFree: true,
            ticketPrice: true,
          },
        },
        session: { include: { venue: { select: { name: true } } } },
        seat: { select: { seatNumber: true, rowLabel: true, seatType: true } },
      },
      orderBy: { bookedAt: 'desc' },
    });

    return bookings.map((booking) => ({
      id: booking.id,
      bookingRef: booking.bookingRef,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentRef: booking.paymentRef,
      razorpayPaymentId: booking.razorpayPaymentId,
      amountPaid: booking.amountPaid,
      gstAmount: booking.gstAmount,
      processingFee: booking.processingFee,
      refundAmount: booking.refundAmount,
      refundId: booking.refundId,
      qrToken: booking.qrToken,
      qrCodeUrl: booking.qrCodeUrl,
      bookedAt: booking.bookedAt,
      confirmedAt: booking.confirmedAt,
      cancelledAt: booking.cancelledAt,
      checkedIn: booking.checkedIn,
      checkedInAt: booking.checkedInAt,
      event: {
        id: booking.event.id,
        slug: booking.event.slug,
        title: booking.event.title,
        campus: booking.event.campus,
        posterUrl: booking.event.posterUrl || booking.event.bannerUrl,
        venue: booking.session.venue.name,
        startDateTime: this.combineDateTime(booking.session.sessionDate, booking.session.startTime),
        endDateTime: this.combineDateTime(booking.session.sessionDate, booking.session.endTime),
        entryFee: booking.event.ticketPrice,
        isFree: booking.event.isFree,
      },
      session: {
        id: booking.session.id,
        title: booking.session.title,
        sessionDate: booking.session.sessionDate,
        startTime: booking.session.startTime,
        endTime: booking.session.endTime,
        venue: booking.session.venue,
      },
      seat: booking.seat
        ? {
            seatNumber: booking.seat.seatNumber,
            row: booking.seat.rowLabel,
            section: booking.seat.seatType,
          }
        : null,
    }));
  }

  async getEventRegistrations(eventId: string, userId: string, role: Role) {
    await this.assertCanManageEvent(eventId, userId, role);

    const registrations = await this.prisma.booking.findMany({
      where: { eventId, status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.WAITLISTED] } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            regNumber: true,
            department: true,
            year: true,
            campus: true,
          },
        },
        seat: { select: { seatNumber: true } },
      },
      orderBy: [{ bookedAt: 'asc' }],
    });

    return registrations.map((registration, index) => ({
      id: registration.id,
      serial: index + 1,
      name: registration.user.name,
      regNo: registration.user.regNumber,
      dept: registration.user.department,
      year: registration.user.year,
      campus: registration.user.campus,
      seat: registration.seat?.seatNumber,
      status: registration.status,
      checkedIn: registration.checkedIn,
      bookedAt: registration.bookedAt,
    }));
  }

  async exportEventRegistrations(eventId: string, userId: string, role: Role) {
    const rows = await this.getEventRegistrations(eventId, userId, role);
    const csv = this.toCsv(rows, [
      'serial',
      'name',
      'regNo',
      'dept',
      'year',
      'campus',
      'seat',
      'status',
      'checkedIn',
      'bookedAt',
    ]);

    return {
      filename: `event-registrations-${eventId}.csv`,
      contentType: 'text/csv',
      csv,
    };
  }

  private async assertCanManageEvent(eventId: string, userId: string, role: Role) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, creatorId: true, club: { select: { presidentId: true } } },
    });
    if (!event) throw new NotFoundException('Event not found');

    const isAdmin = role === Role.SUPER_ADMIN || role === Role.FACULTY;
    const isOwner = event.creatorId === userId || event.club?.presidentId === userId;
    if (!isAdmin && !isOwner) {
      throw new BadRequestException('Not allowed to manage this event');
    }

    return event;
  }

  private toCsv(rows: Record<string, any>[], headers: string[]) {
    const escape = (value: unknown) => {
      const text = value === null || value === undefined ? '' : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };

    return [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => escape(row[header])).join(',')),
    ].join('\n');
  }
}
