import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import {
  BookingStatus,
  Campus,
  EventStatus,
  EventVisibility,
  Role,
  SessionStatus,
} from '@prisma/client';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDesc?: string;

  @IsEnum(Campus)
  campus: Campus;

  @IsOptional()
  @IsString()
  venue?: string;

  @Type(() => Date)
  @IsDate()
  startDateTime: Date;

  @Type(() => Date)
  @IsDate()
  endDateTime: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  registrationDeadline?: Date;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teamSize?: number;

  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  prizePool?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  entryFee?: number;

  @IsOptional()
  @IsBoolean()
  isTeamEvent?: boolean;

  @IsOptional()
  @IsBoolean()
  hasWaitlist?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  points?: number;

  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  @IsBoolean()
  certificateEligible?: boolean;
}

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    campus?: Campus;
    status?: EventStatus;
    search?: string;
    tag?: string;
    category?: string;
    createdBy?: string;
    clubId?: string;
    includeAll?: boolean | string;
    page?: number;
    limit?: number;
  }) {
    const {
      campus,
      status,
      search,
      tag,
      category,
      createdBy,
      clubId,
      includeAll,
      page = 1,
      limit = 20,
    } = filters;

    const currentPage = Math.max(Number(page) || 1, 1);
    const currentLimit = Math.max(Number(limit) || 20, 1);
    const skip = (currentPage - 1) * currentLimit;
    const includeEverything = includeAll === true || includeAll === 'true';

    const where: any = {};

    if (campus) where.campus = campus;
    if (tag) where.tags = { has: tag.toLowerCase() };
    if (category) {
      where.category = {
        name: {
          equals: category,
          mode: 'insensitive',
        },
      };
    }
    if (createdBy) where.creatorId = createdBy;
    if (clubId) where.clubId = clubId;
    if (status) {
      where.status = status;
    } else if (!includeEverything && !createdBy && !clubId) {
      where.status = EventStatus.PUBLISHED;
    }
    if (!includeEverything && !createdBy && !clubId) {
      where.visibility = EventVisibility.PUBLIC;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDesc: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: currentLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          club: { select: { id: true, name: true, logo: true } },
          creator: { select: { id: true, name: true, avatar: true } },
          sessions: {
            orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
            take: 1,
            include: { venue: { select: { name: true } } },
          },
          _count: { select: { bookings: true, attendances: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: events.map((event) => this.serializeEvent(event)),
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        pages: Math.ceil(total / currentLimit),
      },
    };
  }

  async findOne(slug: string) {
    // First sync seats for all sessions if needed (lightweight check)
    const brief = await this.prisma.event.findUnique({
      where: { slug },
      include: { sessions: { select: { id: true, totalSeats: true } } },
    });
    if (!brief) throw new NotFoundException('Event not found');
    for (const session of brief.sessions) {
      if (session.totalSeats) await this.syncSessionSeats(session.id, session.totalSeats);
    }

    const freshEvent = await this.prisma.event.findUnique({
      where: { slug },
      include: {
        club: { select: { id: true, name: true, logo: true, campus: true } },
        creator: { select: { id: true, name: true, avatar: true } },
        sessions: {
          orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
          include: {
            venue: { select: { id: true, name: true, campus: true } },
            seats: {
              orderBy: { seatNumber: 'asc' },
              select: {
                id: true,
                seatNumber: true,
                rowLabel: true,
                seatType: true,
                status: true,
                lockedUntil: true,
              },
            },
            _count: { select: { bookings: true, waitlist: true } },
          },
        },
        _count: { select: { bookings: true, attendances: true } },
      },
    });

    return this.serializeEvent(freshEvent, true);
  }

  async create(dto: CreateEventDto, creatorId: string) {
    const slug = this.generateSlug(dto.title);
    const venue = await this.resolveVenue(dto.venue, dto.campus, dto.capacity);
    const category = await this.resolveCategory(dto.category);
    const sessionDate = this.extractDate(dto.startDateTime);

    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        shortDesc: dto.shortDesc,
        campus: dto.campus,
        categoryId: category?.id,
        tags: dto.tags?.map((tag) => tag.toLowerCase()) || [],
        visibility: dto.visibility || EventVisibility.PUBLIC,
        registrationEnd: dto.registrationDeadline,
        maxRegistrations: dto.capacity,
        isFree: !dto.entryFee,
        ticketPrice: dto.entryFee || 0,
        prizePool: dto.prizePool,
        teamSize: dto.teamSize || 1,
        isTeamEvent: dto.isTeamEvent || false,
        hasWaitlist: dto.hasWaitlist ?? true,
        certificateEligible: dto.certificateEligible ?? true,
        points: dto.points || 10,
        clubId: dto.clubId,
        creatorId,
        status: EventStatus.DRAFT,
        sessions: {
          create: {
            title: dto.venue ? `${dto.title} Session` : undefined,
            sessionDate,
            startTime: this.extractTime(dto.startDateTime),
            endTime: this.extractTime(dto.endDateTime),
            totalSeats: dto.capacity,
            status: SessionStatus.SCHEDULED,
            venueId: venue.id,
          },
        },
      },
      include: {
        club: { select: { id: true, name: true, logo: true } },
        creator: { select: { id: true, name: true, avatar: true } },
        sessions: {
          take: 1,
          include: { venue: { select: { name: true } } },
        },
        _count: { select: { bookings: true, attendances: true } },
      },
    });

    const primarySession = event.sessions[0];
    if (primarySession && dto.capacity > 0) {
      await this.syncSessionSeats(primarySession.id, dto.capacity);
    }

    const freshEvent = await this.prisma.event.findUnique({
      where: { id: event.id },
      include: {
        club: { select: { id: true, name: true, logo: true } },
        creator: { select: { id: true, name: true, avatar: true } },
        sessions: {
          orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
          include: {
            venue: { select: { id: true, name: true, campus: true } },
            seats: {
              orderBy: { seatNumber: 'asc' },
              select: {
                id: true,
                seatNumber: true,
                rowLabel: true,
                seatType: true,
                status: true,
                lockedUntil: true,
              },
            },
          },
        },
        _count: { select: { bookings: true, attendances: true } },
      },
    });

    return this.serializeEvent(freshEvent, true);
  }

  async update(id: string, dto: Partial<CreateEventDto>, userId: string, userRole: Role) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { sessions: { orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }], take: 1 } },
    });
    if (!event) throw new NotFoundException('Event not found');

    if (event.creatorId !== userId && userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot edit this event');
    }

    const venue = dto.venue || dto.capacity || dto.startDateTime || dto.endDateTime
      ? await this.resolveVenue(dto.venue, dto.campus || event.campus, dto.capacity || event.maxRegistrations || 100)
      : null;
    const category = dto.category !== undefined ? await this.resolveCategory(dto.category) : undefined;

    await this.prisma.event.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        shortDesc: dto.shortDesc,
        campus: dto.campus,
        categoryId: category?.id,
        tags: dto.tags?.map((tag) => tag.toLowerCase()),
        visibility: dto.visibility,
        registrationEnd: dto.registrationDeadline,
        maxRegistrations: dto.capacity,
        isFree: dto.entryFee !== undefined ? dto.entryFee <= 0 : undefined,
        ticketPrice: dto.entryFee,
        prizePool: dto.prizePool,
        teamSize: dto.teamSize,
        isTeamEvent: dto.isTeamEvent,
        hasWaitlist: dto.hasWaitlist,
        certificateEligible: dto.certificateEligible,
        points: dto.points,
        clubId: dto.clubId,
      },
    });

    const primarySession = event.sessions[0];
    if (primarySession) {
      await this.prisma.eventSession.update({
        where: { id: primarySession.id },
        data: {
          sessionDate: dto.startDateTime ? this.extractDate(dto.startDateTime) : undefined,
          startTime: dto.startDateTime ? this.extractTime(dto.startDateTime) : undefined,
          endTime: dto.endDateTime ? this.extractTime(dto.endDateTime) : undefined,
          totalSeats: dto.capacity,
          venueId: venue?.id,
        },
      });

      if (dto.capacity) {
        await this.syncSessionSeats(primarySession.id, dto.capacity);
      }
    }

    const freshEvent = await this.prisma.event.findUnique({
      where: { id },
      include: {
        club: { select: { id: true, name: true, logo: true } },
        creator: { select: { id: true, name: true, avatar: true } },
        sessions: {
          orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
          include: {
            venue: { select: { id: true, name: true, campus: true } },
            seats: {
              orderBy: { seatNumber: 'asc' },
              select: {
                id: true,
                seatNumber: true,
                rowLabel: true,
                seatType: true,
                status: true,
                lockedUntil: true,
              },
            },
          },
        },
        _count: { select: { bookings: true, attendances: true } },
      },
    });

    return this.serializeEvent(freshEvent, true);
  }

  async publish(id: string, userId: string, userRole: Role) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (userRole !== Role.SUPER_ADMIN && userRole !== Role.FACULTY) {
      throw new ForbiddenException('Only admins can approve events');
    }
    return this.prisma.event.update({ where: { id }, data: { status: EventStatus.PUBLISHED } });
  }

  async reject(id: string, userId: string, userRole: Role, note?: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (userRole !== Role.SUPER_ADMIN && userRole !== Role.FACULTY) {
      throw new ForbiddenException('Only admins can reject events');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        status: EventStatus.CANCELLED,
        description: note
          ? `${event.description || ''}\n\nAdmin note: ${note}`.trim()
          : event.description,
      },
    });
  }

  async getLiveEvents() {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await this.prisma.event.findMany({
      where: {
        status: { in: [EventStatus.PUBLISHED, EventStatus.LIVE] },
        sessions: { some: { sessionDate: { gte: startOfDay, lte: endOfDay } } },
      },
      include: {
        club: { select: { name: true, logo: true } },
        sessions: {
          orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
          take: 1,
          include: { venue: { select: { name: true } } },
        },
        _count: { select: { bookings: true, attendances: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return events.map((event) => this.serializeEvent(event));
  }

  async getTrending() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const events = await this.prisma.event.findMany({
      where: { status: EventStatus.PUBLISHED, createdAt: { gte: since } },
      include: {
        club: { select: { name: true, logo: true } },
        sessions: {
          orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
          take: 1,
          include: { venue: { select: { name: true } } },
        },
        _count: { select: { bookings: true, attendances: true } },
      },
      take: 20,
    });

    return events
      .sort((a, b) => (b._count?.bookings || 0) - (a._count?.bookings || 0))
      .slice(0, 10)
      .map((event) => this.serializeEvent(event));
  }

  async getDashboardStats() {
    const [totalEvents, totalRegistrations, liveCount, campusBreakdown] = await Promise.all([
      this.prisma.event.count({ where: { status: EventStatus.PUBLISHED } }),
      this.prisma.booking.count({
        where: { status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.WAITLISTED] } },
      }),
      this.prisma.event.count({ where: { status: EventStatus.LIVE } }),
      this.prisma.event.groupBy({
        by: ['campus'],
        _count: true,
        where: { status: EventStatus.PUBLISHED },
      }),
    ]);
    return { totalEvents, totalRegistrations, liveCount, campusBreakdown };
  }

  async markAttendance(eventId: string, qrCode: string, scannedById: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { eventId, qrToken: qrCode },
      include: { user: true },
    });
    if (!booking) throw new NotFoundException('Invalid QR code');

    await this.prisma.$transaction([
      this.prisma.attendance.upsert({
        where: { userId_eventId: { userId: booking.userId, eventId } },
        create: {
          userId: booking.userId,
          eventId,
          sessionId: booking.sessionId,
          scannedByUserId: scannedById,
        },
        update: { scannedAt: new Date(), scannedByUserId: scannedById },
      }),
      this.prisma.booking.update({
        where: { id: booking.id },
        data: { checkedIn: true, checkedInAt: new Date(), status: BookingStatus.CONFIRMED },
      }),
      this.prisma.pointTransaction.create({
        data: { userId: booking.userId, points: 20, reason: 'Event Attendance', referenceId: eventId },
      }),
      this.prisma.user.update({
        where: { id: booking.userId },
        data: { points: { increment: 20 } },
      }),
    ]);

    return { success: true, user: { name: booking.user.name, regNumber: booking.user.regNumber } };
  }

  private async resolveVenue(name: string | undefined, campus: Campus, capacity: number) {
    if (name) {
      const exact = await this.prisma.venue.findFirst({
        where: { campus, name: { equals: name, mode: 'insensitive' } },
      });
      if (exact) return exact;

      return this.prisma.venue.create({
        data: {
          name,
          campus,
          seatingCapacity: capacity,
          hasProjector: true,
          hasAC: true,
          hasWifi: true,
        },
      });
    }

    const existing = await this.prisma.venue.findFirst({
      where: { campus, isActive: true },
      orderBy: { seatingCapacity: 'desc' },
    });

    if (existing) return existing;

    return this.prisma.venue.create({
      data: {
        name: `${campus} Main Venue`,
        campus,
        seatingCapacity: capacity,
        hasProjector: true,
        hasAC: true,
        hasWifi: true,
      },
    });
  }

  private async resolveCategory(name?: string) {
    if (!name?.trim()) return null;
    const trimmed = name.trim();

    const existing = await this.prisma.eventCategory.findFirst({
      where: { name: { equals: trimmed, mode: 'insensitive' } },
    });
    if (existing) return existing;

    return this.prisma.eventCategory.create({
      data: {
        name: trimmed,
        description: `${trimmed} events`,
      },
    });
  }

  private async generateSeats(sessionId: string, capacity: number) {
    const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const seatsPerRow = Math.ceil(capacity / rows.length);
    const seats = [];
    let count = 0;

    for (let r = 0; r < rows.length && count < capacity; r++) {
      for (let s = 1; s <= seatsPerRow && count < capacity; s++) {
        seats.push({ sessionId, seatNumber: `${rows[r]}${s}`, rowLabel: rows[r] });
        count++;
      }
    }

    await this.prisma.seat.createMany({ data: seats, skipDuplicates: true });
  }

  private async syncSessionSeats(sessionId: string, capacity: number) {
    const existingSeats = await this.prisma.seat.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      include: { booking: true },
    });

    if (existingSeats.length < capacity) {
      await this.generateSeats(sessionId, capacity);
      return;
    }

    if (existingSeats.length === capacity) return;

    const seatsToRemove = existingSeats
      .slice(capacity)
      .filter((seat) => seat.status === 'AVAILABLE' && !seat.booking);

    if (existingSeats.length - seatsToRemove.length > capacity) {
      throw new BadRequestException('Cannot reduce capacity below already reserved or booked seats');
    }

    if (seatsToRemove.length > 0) {
      await this.prisma.seat.deleteMany({
        where: { id: { in: seatsToRemove.map((seat) => seat.id) } },
      });
    }
  }

  private serializeEvent(event: any, includeSeats = false) {
    if (!event) return event;

    const sessions = event.sessions || [];
    const primarySession = sessions[0];
    const latestSession = sessions[sessions.length - 1] || primarySession;
    const startDateTime = primarySession
      ? this.combineDateTime(primarySession.sessionDate, primarySession.startTime)
      : event.createdAt;
    const endDateTime = latestSession
      ? this.combineDateTime(latestSession.sessionDate, latestSession.endTime)
      : event.updatedAt;
    const capacity = sessions.length > 0
      ? sessions.reduce((sum: number, session: any) => sum + (session.totalSeats || 0), 0)
      : event.maxRegistrations || 0;

    return {
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      shortDesc: event.shortDesc,
      campus: event.campus,
      category: event.category?.name,
      venue: primarySession?.venue?.name,
      posterUrl: event.posterUrl || event.bannerUrl,
      bannerUrl: event.bannerUrl,
      startDateTime,
      endDateTime,
      registrationDeadline: event.registrationEnd,
      capacity,
      teamSize: event.teamSize,
      status: event.status,
      visibility: event.visibility,
      tags: event.tags || [],
      prizePool: event.prizePool,
      entryFee: event.ticketPrice,
      certificateEligible: event.certificateEligible,
      isTeamEvent: event.isTeamEvent,
      hasWaitlist: event.hasWaitlist,
      points: event.points,
      club: event.club,
      creator: event.creator,
      _count: {
        registrations: event._count?.bookings || 0,
        attendances: event._count?.attendances || 0,
      },
      createdAt: event.createdAt,
      sessions: sessions.map((session: any) => ({
        id: session.id,
        title: session.title,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
        venue: session.venue,
        totalSeats: session.totalSeats,
        speakerName: session.speakerName || null,
        speakerBio: session.speakerBio || null,
        streamUrl: session.streamUrl || null,
        status: session.status,
        _count: session._count,
        seats: includeSeats && session.seats
          ? session.seats.map((seat: any) => ({
              id: seat.id,
              eventId: event.id,
              sessionId: session.id,
              seatNumber: seat.seatNumber,
              row: seat.rowLabel,
              section: seat.seatType,
              status: seat.status === 'LOCKED' ? 'HELD' : seat.status,
              heldUntil: seat.lockedUntil,
            }))
          : undefined,
      })),
      seats: includeSeats && primarySession?.seats
        ? primarySession.seats.map((seat: any) => ({
            id: seat.id,
            eventId: event.id,
            sessionId: primarySession.id,
            seatNumber: seat.seatNumber,
            row: seat.rowLabel,
            section: seat.seatType,
            status: seat.status === 'LOCKED' ? 'HELD' : seat.status,
            heldUntil: seat.lockedUntil,
          }))
        : undefined,
    };
  }

  private combineDateTime(date: Date, time: string): Date {
    const [hours, minutes] = (time || '00:00').split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours || 0, minutes || 0, 0, 0);
    return combined;
  }

  private extractDate(dateTime: Date) {
    const date = new Date(dateTime);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private extractTime(dateTime: Date): string {
    const date = new Date(dateTime);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private generateSlug(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
  }

  async submitFeedback(eventId: string, userId: string, dto: { rating: number; comment?: string }) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    const existing = await this.prisma.eventFeedback.findFirst({ where: { eventId, userId } });
    if (existing) {
      return this.prisma.eventFeedback.update({ where: { id: existing.id }, data: { rating: dto.rating, comment: dto.comment } });
    }
    return this.prisma.eventFeedback.create({ data: { eventId, userId, rating: dto.rating, comment: dto.comment } });
  }

  async getMedia(eventId: string) {
    return this.prisma.eventMedia.findMany({ where: { eventId }, orderBy: { uploadedAt: 'desc' } });
  }

  async addMedia(eventId: string, dto: { url: string; type: string; caption?: string }) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    return this.prisma.eventMedia.create({ data: { eventId, url: dto.url, type: dto.type, caption: dto.caption } });
  }

  async deleteMedia(eventId: string, mediaId: string) {
    return this.prisma.eventMedia.delete({ where: { id: mediaId } });
  }

}