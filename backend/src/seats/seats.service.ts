import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, NotifType, PaymentStatus, SeatStatus } from '@prisma/client';
import { SeatsGateway } from './seats.gateway';

const HOLD_TTL_MS = 5 * 60 * 1000;

type HoldRecord = {
  userId: string;
  eventId: string;
  sessionId: string;
  expiresAt: number;
  timer: NodeJS.Timeout;
};

function generateLayoutSeats(
  sessionId: string,
  capacity: number,
  layoutType: string,
  seatLayout?: any,
): Array<{ sessionId: string; seatNumber: string; rowLabel: string; seatType: string }> {
  if (seatLayout && Array.isArray(seatLayout.seats)) {
    return seatLayout.seats.map((s: any) => ({
      sessionId,
      seatNumber: s.seatNumber,
      rowLabel: s.rowLabel || s.seatNumber[0],
      seatType: s.seatType || 'GENERAL',
    }));
  }

  const seats: Array<{ sessionId: string; seatNumber: string; rowLabel: string; seatType: string }> = [];
  const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  switch (layoutType) {
    case 'AUDITORIUM': {
      const balconyRows = Math.min(3, Math.ceil(capacity * 0.15 / 8));
      const balconyPerRow = 8;
      const remainingCapacity = capacity - balconyRows * balconyPerRow;
      const mainPerRow = Math.ceil(remainingCapacity / 20);
      let count = 0;
      for (let r = 0; r < balconyRows && count < capacity; r++) {
        for (let s = 1; s <= balconyPerRow && count < capacity; s++) {
          seats.push({ sessionId, seatNumber: `${rows[r]}${s}`, rowLabel: rows[r], seatType: 'VIP' });
          count++;
        }
      }
      for (let r = balconyRows; r < rows.length && count < capacity; r++) {
        for (let s = 1; s <= mainPerRow && count < capacity; s++) {
          seats.push({ sessionId, seatNumber: `${rows[r]}${s}`, rowLabel: rows[r], seatType: 'GENERAL' });
          count++;
        }
      }
      break;
    }
    case 'THEATRE': {
      const premiumRows = Math.min(3, Math.ceil(capacity * 0.2 / 10));
      const seatsPerRow = Math.ceil(capacity / 20);
      let count = 0;
      for (let r = 0; r < rows.length && count < capacity; r++) {
        const sType = r < premiumRows ? 'PREMIUM' : 'GENERAL';
        for (let s = 1; s <= seatsPerRow && count < capacity; s++) {
          seats.push({ sessionId, seatNumber: `${rows[r]}${s}`, rowLabel: rows[r], seatType: sType });
          count++;
        }
      }
      break;
    }
    case 'STADIUM': {
      const sections = ['N', 'S', 'E', 'W'];
      const perSection = Math.ceil(capacity / sections.length);
      const rowsPerSection = Math.ceil(perSection / 15);
      let count = 0;
      for (const sec of sections) {
        for (let r = 1; r <= rowsPerSection && count < capacity; r++) {
          for (let s = 1; s <= 15 && count < capacity; s++) {
            seats.push({ sessionId, seatNumber: `${sec}${r}-${s}`, rowLabel: `${sec}${r}`, seatType: r <= 2 ? 'VIP' : 'GENERAL' });
            count++;
          }
        }
      }
      break;
    }
    case 'CLASSROOM':
    case 'LAB': {
      const cols = layoutType === 'LAB' ? 6 : Math.min(10, Math.ceil(Math.sqrt(capacity)));
      let count = 0;
      for (let r = 0; r < rows.length && count < capacity; r++) {
        for (let s = 1; s <= cols && count < capacity; s++) {
          seats.push({ sessionId, seatNumber: `${rows[r]}${s}`, rowLabel: rows[r], seatType: 'GENERAL' });
          count++;
        }
      }
      break;
    }
    case 'OPEN': {
      for (let i = 1; i <= capacity; i++) {
        seats.push({ sessionId, seatNumber: `${i}`, rowLabel: 'General', seatType: 'GENERAL' });
      }
      break;
    }
    default: {
      const seatsPerRow = Math.ceil(capacity / rows.length);
      let count = 0;
      for (let r = 0; r < rows.length && count < capacity; r++) {
        for (let s = 1; s <= seatsPerRow && count < capacity; s++) {
          seats.push({ sessionId, seatNumber: `${rows[r]}${s}`, rowLabel: rows[r], seatType: 'GENERAL' });
          count++;
        }
      }
    }
  }
  return seats;
}

@Injectable()
export class SeatsService {
  private readonly logger = new Logger(SeatsService.name);
  private readonly holdCache = new Map<string, HoldRecord>();
  private readonly userHoldCache = new Map<string, string>();

  constructor(
    private prisma: PrismaService,
    private seatsGateway: SeatsGateway,
  ) {}

  async getSeatMap(eventId: string, sessionId?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        sessions: {
          orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
          include: {
            seats: { orderBy: { seatNumber: 'asc' } },
            venue: { select: { name: true, layoutType: true } },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Event not found');

    const session = sessionId
      ? event.sessions.find((s) => s.id === sessionId)
      : event.sessions[0];

    if (!session) return { eventId, seats: [], summary: { total: 0, available: 0, held: 0, booked: 0 } };

    const seats = session.seats.map((seat) => {
      const hold = this.holdCache.get(seat.id);
      const isHeld = hold && hold.expiresAt > Date.now();
      return {
        id: seat.id,
        eventId,
        sessionId: session.id,
        seatNumber: seat.seatNumber,
        row: seat.rowLabel,
        section: seat.seatType,
        status: isHeld ? 'HELD' : seat.status,
        heldUntil: isHeld ? new Date(hold.expiresAt) : seat.lockedUntil,
      };
    });

    const summary = {
      total: seats.length,
      available: seats.filter((s) => s.status === SeatStatus.AVAILABLE).length,
      held: seats.filter((s) => s.status === 'HELD').length,
      booked: seats.filter((s) => s.status === SeatStatus.BOOKED).length,
    };

    return {
      eventId,
      sessionId: session.id,
      layoutType: (session as any).venue?.layoutType || 'GENERIC',
      seats,
      summary,
    };
  }

  async getEventSessions(eventId: string) {
    const sessions = await this.prisma.eventSession.findMany({
      where: { eventId },
      orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
      include: {
        venue: { select: { id: true, name: true, layoutType: true } },
        _count: { select: { seats: true, bookings: true, waitlist: true } },
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      title: s.title || 'Main Session',
      sessionDate: s.sessionDate,
      startTime: s.startTime,
      endTime: s.endTime,
      totalSeats: s.totalSeats,
      speakerName: s.speakerName,
      speakerBio: s.speakerBio,
      streamUrl: s.streamUrl,
      status: s.status,
      venue: s.venue,
      _count: s._count,
    }));
  }

  async holdSeat(eventId: string, seatId: string, userId: string, sessionId?: string): Promise<{ held: boolean; heldUntil: Date; message: string }> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { sessions: { orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }] } },
    });
    if (!event) throw new NotFoundException('Event not found');

    const session = sessionId ? event.sessions.find((s) => s.id === sessionId) : event.sessions[0];
    if (!session) throw new BadRequestException('This event has no bookable session');

    const now = new Date();
    if ((event as any).registrationStart && now < (event as any).registrationStart) {
      throw new BadRequestException('Registration has not opened yet');
    }
    if (event.registrationEnd && now > event.registrationEnd) {
      throw new BadRequestException('Registration has closed');
    }

    const userHoldKey = `${userId}:${session.id}`;
    const existingUserHeldSeatId = this.userHoldCache.get(userHoldKey);
    if (existingUserHeldSeatId) {
      if (existingUserHeldSeatId === seatId) {
        const currentHold = this.holdCache.get(seatId);
        if (currentHold && currentHold.expiresAt > Date.now()) {
          return {
            held: true,
            heldUntil: new Date(currentHold.expiresAt),
            message: 'This seat is already on hold for you.',
          };
        }
      } else {
        await this.releaseSeat(existingUserHeldSeatId, userId, eventId);
      }
    }

    const existingHold = this.holdCache.get(seatId);
    if (existingHold && existingHold.expiresAt > Date.now() && existingHold.userId !== userId) {
      throw new ConflictException('Seat is being processed by another user. Try again in a moment.');
    }

    const seat = await this.prisma.seat.findUnique({ where: { id: seatId }, include: { session: true } });
    if (!seat) throw new NotFoundException('Seat not found');
    if (seat.sessionId !== session.id) throw new BadRequestException('Seat does not belong to this session');
    if (seat.status === SeatStatus.BOOKED) throw new ConflictException('Seat is already booked');

    const existingBooking = await this.prisma.booking.findUnique({
      where: { userId_sessionId: { userId, sessionId: session.id } },
    });
    if (existingBooking && existingBooking.status !== BookingStatus.CANCELLED) {
      throw new ConflictException('You are already registered for this session');
    }

    const heldUntil = new Date(Date.now() + HOLD_TTL_MS);
    await this.prisma.seat.update({
      where: { id: seatId },
      data: { status: SeatStatus.LOCKED, lockedUntil: heldUntil, lockedById: userId },
    });

    const timer = setTimeout(() => { void this.releaseSeat(seatId, userId, eventId); }, HOLD_TTL_MS);
    this.holdCache.set(seatId, { userId, eventId, sessionId: session.id, expiresAt: heldUntil.getTime(), timer });
    this.userHoldCache.set(userHoldKey, seatId);

    this.logger.log(`Seat ${seatId} held by user ${userId} until ${heldUntil.toISOString()}`);
    this.seatsGateway.broadcastSeatUpdate(eventId, seatId, 'HELD', heldUntil);

    return { held: true, heldUntil, message: `Seat held for ${HOLD_TTL_MS / 60000} minutes. Complete your registration.` };
  }

  async confirmBooking(eventId: string, seatId: string, userId: string) {
    const hold = this.holdCache.get(seatId);
    if (!hold || hold.userId !== userId || hold.eventId !== eventId || hold.expiresAt <= Date.now()) {
      throw new BadRequestException('Hold expired or seat belongs to another user. Please select again.');
    }

    const seat = await this.prisma.seat.findUnique({ where: { id: seatId } });
    if (!seat) throw new NotFoundException('Seat not found');

    const existing = await this.prisma.booking.findUnique({
      where: { userId_sessionId: { userId, sessionId: hold.sessionId } },
    });
    if (existing && existing.status !== BookingStatus.CANCELLED) {
      throw new ConflictException('Already registered');
    }

    const bookingRef = `VIT-${Date.now().toString(36).toUpperCase()}`;
    const qrToken = this.generateQrToken(userId, eventId, seatId);

    const [, booking] = await this.prisma.$transaction([
      this.prisma.seat.update({
        where: { id: seatId },
        data: { status: SeatStatus.BOOKED, lockedUntil: null, lockedById: null, bookedAt: new Date() },
      }),
      this.prisma.booking.upsert({
        where: { userId_sessionId: { userId, sessionId: hold.sessionId } },
        create: { bookingRef, userId, eventId, sessionId: hold.sessionId, seatId, status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.FREE, qrToken, confirmedAt: new Date() },
        update: { seatId, status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.FREE, qrToken, confirmedAt: new Date(), cancelledAt: null, cancellationReason: null },
      }),
    ]);

    this.clearHold(seatId, userId, eventId);
    this.seatsGateway.broadcastSeatUpdate(eventId, seatId, 'BOOKED');

    await this.prisma.pointTransaction.create({ data: { userId, points: 10, reason: 'Event Registration', referenceId: eventId } });
    await this.prisma.user.update({ where: { id: userId }, data: { points: { increment: 10 } } });

    this.logger.log(`Booking confirmed: seat ${seatId} -> user ${userId}`);
    return { booked: true, registration: booking, qrCode: booking.qrToken };
  }

  async releaseSeat(seatId: string, userId: string, eventId: string) {
    const hold = this.holdCache.get(seatId);
    if (!hold || hold.userId !== userId || hold.eventId !== eventId) {
      return { released: false, message: 'No active hold found for this seat.' };
    }
    this.clearHold(seatId, userId, eventId);
    await this.prisma.seat.update({ where: { id: seatId }, data: { status: SeatStatus.AVAILABLE, lockedUntil: null, lockedById: null } });
    this.seatsGateway.broadcastSeatUpdate(eventId, seatId, 'AVAILABLE');
    await this.promoteWaitlist(eventId, hold.sessionId);
    this.logger.log(`Seat ${seatId} released after hold timeout for user ${userId}`);
    return { released: true, message: 'Seat hold released.' };
  }

  async joinWaitlist(eventId: string, userId: string, sessionId?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { sessions: { orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }] } },
    });
    if (!event) throw new NotFoundException('Event not found');

    const session = sessionId ? event.sessions.find((s) => s.id === sessionId) : event.sessions[0];
    if (!session) throw new BadRequestException('This event has no bookable session');

    const existingBooking = await this.prisma.booking.findUnique({ where: { userId_sessionId: { userId, sessionId: session.id } } });
    if (existingBooking && existingBooking.status !== BookingStatus.CANCELLED) {
      throw new ConflictException('Already registered or waiting for this event');
    }

    const existingWaitlist = await this.prisma.waitlist.findUnique({ where: { userId_sessionId: { userId, sessionId: session.id } } });
    if (existingWaitlist) throw new ConflictException('Already in waitlist');

    const queuePosition = (await this.prisma.waitlist.count({ where: { sessionId: session.id } })) + 1;
    await this.prisma.waitlist.create({ data: { userId, sessionId: session.id, queuePosition } });

    return { waitlisted: true, message: 'Added to waitlist. You will be notified if a seat opens.' };
  }

  async generateSeatsForSession(sessionId: string, capacity: number) {
    const session = await this.prisma.eventSession.findUnique({
      where: { id: sessionId },
      include: { venue: { select: { layoutType: true } } },
    });
    const layoutType = (session as any)?.venue?.layoutType || 'GENERIC';
    const seatLayout = (session as any)?.seatLayout;
    const seatData = generateLayoutSeats(sessionId, capacity, layoutType, seatLayout);
    await this.prisma.seat.createMany({ data: seatData as any, skipDuplicates: true });
  }

  async syncSessionSeats(sessionId: string, capacity: number) {
    const existingSeats = await this.prisma.seat.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' }, include: { booking: true } });
    if (existingSeats.length === 0) { await this.generateSeatsForSession(sessionId, capacity); return; }
    if (existingSeats.length === capacity) return;
    if (existingSeats.length < capacity) { await this.generateSeatsForSession(sessionId, capacity); return; }
    const seatsToRemove = existingSeats.slice(capacity).filter((seat) => seat.status === 'AVAILABLE' && !seat.booking);
    if (existingSeats.length - seatsToRemove.length > capacity) {
      throw new BadRequestException('Cannot reduce capacity below already reserved or booked seats');
    }
    if (seatsToRemove.length > 0) {
      await this.prisma.seat.deleteMany({ where: { id: { in: seatsToRemove.map((seat) => seat.id) } } });
    }
  }

  private async promoteWaitlist(eventId: string, sessionId: string) {
    const available = await this.prisma.seat.findFirst({ where: { sessionId, status: SeatStatus.AVAILABLE }, orderBy: { seatNumber: 'asc' } });
    if (!available) return;
    const waitlisted = await this.prisma.waitlist.findFirst({ where: { sessionId, notified: false }, orderBy: { queuePosition: 'asc' } });
    if (!waitlisted) return;
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { slug: true } });
    await this.prisma.waitlist.update({ where: { id: waitlisted.id }, data: { notified: true, notifiedAt: new Date() } });
    await this.prisma.notification.create({
      data: { userId: waitlisted.userId, title: '🎊 Seat Available — Claim Now!', message: 'A seat opened for your waitlisted event. You have 15 minutes to claim it.', type: NotifType.WAITLIST_PROMOTED, data: { eventId, seatId: available.id, claimUrl: `/waitlist-claim?eventId=${eventId}&seatId=${available.id}${event?.slug ? `&eventSlug=${event.slug}` : ''}` } },
    });
    this.logger.log(`Promoted user ${waitlisted.userId} from waitlist for event ${eventId}`);
  }

  private clearHold(seatId: string, userId: string, eventId: string) {
    const hold = this.holdCache.get(seatId);
    if (hold?.timer) clearTimeout(hold.timer);
    this.holdCache.delete(seatId);
    this.userHoldCache.delete(`${userId}:${hold?.sessionId || ''}`);
  }

  private generateQrToken(userId: string, eventId: string, seatId: string): string {
    const data = `${userId}:${eventId}:${seatId}:${Date.now()}`;
    return Buffer.from(data).toString('base64url');
  }
}
