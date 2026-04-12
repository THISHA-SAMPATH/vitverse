import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Campus, EventStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export class CreateClubDto {
  name: string;
  description?: string;
  shortBio?: string;
  campus: Campus;
  category: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
}

@Injectable()
export class ClubsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: { campus?: Campus; category?: string; search?: string }) {
    const { campus, category, search } = filters;
    const where: any = { isActive: true };
    if (campus) where.campus = campus;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.club.findMany({
      where,
      orderBy: { points: 'desc' },
      include: {
        president: { select: { id: true, name: true, avatar: true } },
        _count: { select: { members: true, events: true } },
      },
    });
  }

  async findOne(slug: string) {
    const club = await this.prisma.club.findUnique({
      where: { slug },
      include: {
        president: { select: { id: true, name: true, avatar: true, email: true } },
        faculty: { select: { id: true, name: true, avatar: true } },
        members: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true, avatar: true, department: true } } },
          take: 50,
        },
        events: {
          where: { status: EventStatus.PUBLISHED },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            sessions: {
              orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
              take: 1,
              include: { venue: { select: { name: true } } },
            },
            _count: { select: { bookings: true, attendances: true } },
          },
        },
        achievements: { orderBy: { date: 'desc' } },
        gallery: { take: 20, orderBy: { uploadedAt: 'desc' } },
        _count: { select: { members: true, events: true } },
      },
    });
    if (!club) throw new NotFoundException('Club not found');

    return {
      ...club,
      events: club.events.map((event) => ({
        ...event,
        venue: event.sessions[0]?.venue?.name,
        startDateTime: this.combineDateTime(event.sessions[0]?.sessionDate, event.sessions[0]?.startTime),
        _count: {
          registrations: event._count.bookings,
          attendances: event._count.attendances,
        },
      })),
    };
  }

  async create(dto: CreateClubDto, presidentId: string) {
    const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + dto.campus.toLowerCase();
    return this.prisma.club.create({
      data: { ...dto, slug, presidentId },
    });
  }

  async update(id: string, dto: Partial<CreateClubDto>, userId: string, userRole: Role) {
    const club = await this.prisma.club.findUnique({ where: { id } });
    if (!club) throw new NotFoundException('Club not found');
    if (club.presidentId !== userId && userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Not authorized to update this club');
    }
    return this.prisma.club.update({ where: { id }, data: dto });
  }

  async joinClub(clubId: string, userId: string) {
    const existing = await this.prisma.clubMember.findUnique({
      where: { userId_clubId: { userId, clubId } },
    });
    if (existing?.isActive) throw new ConflictException('Already a member');

    const member = existing
      ? await this.prisma.clubMember.update({ where: { id: existing.id }, data: { isActive: true } })
      : await this.prisma.clubMember.create({ data: { userId, clubId } });

    await this.prisma.pointTransaction.create({
      data: { userId, points: 5, reason: 'Joined a Club', referenceId: clubId },
    });
    await this.prisma.user.update({ where: { id: userId }, data: { points: { increment: 5 } } });

    return member;
  }

  async leaveClub(clubId: string, userId: string) {
    const member = await this.prisma.clubMember.findUnique({
      where: { userId_clubId: { userId, clubId } },
    });
    if (!member || !member.isActive) throw new NotFoundException('Not a club member');

    return this.prisma.clubMember.update({
      where: { id: member.id },
      data: { isActive: false },
    });
  }

  async getCategories() {
    return this.prisma.club.groupBy({
      by: ['category'],
      _count: true,
      where: { isActive: true },
    });
  }

  async getPresidentDashboard(presidentId: string) {
    const clubs = await this.prisma.club.findMany({
      where: { presidentId },
      include: {
        _count: { select: { members: true, events: true } },
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                department: true,
                regNumber: true,
                points: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        events: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            sessions: {
              orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
              take: 1,
              include: { venue: { select: { name: true } } },
            },
            _count: { select: { bookings: true, attendances: true } },
          },
        },
      },
    });

    const serializedClubs = clubs.map((club) => ({
      ...club,
      events: club.events.map((event) => ({
        ...event,
        venue: event.sessions[0]?.venue?.name,
        startDateTime: this.combineDateTime(event.sessions[0]?.sessionDate, event.sessions[0]?.startTime),
        _count: {
          registrations: event._count.bookings,
          attendances: event._count.attendances,
        },
      })),
    }));

    const primaryClub = serializedClubs[0] || null;
    const totalPoints = clubs.reduce((sum, club) => sum + club.points, 0);

    return {
      club: primaryClub,
      members: primaryClub?.members || [],
      clubs: serializedClubs,
      totalPoints,
    };
  }

  async addAchievement(clubId: string, data: { title: string; description?: string; date: Date; imageUrl?: string }, userId: string) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');
    if (club.presidentId !== userId) throw new ForbiddenException();

    return this.prisma.clubAchievement.create({ data: { clubId, ...data } });
  }

  async computeHealthScore(clubId: string): Promise<number> {
    const [memberCount, recentEvents, recentAttendance] = await Promise.all([
      this.prisma.clubMember.count({ where: { clubId, isActive: true } }),
      this.prisma.event.count({
        where: { clubId, createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.event.findMany({
        where: { clubId, status: EventStatus.COMPLETED },
        include: { _count: { select: { attendances: true, bookings: true } } },
        take: 5,
      }),
    ]);

    const activityScore = Math.min(recentEvents * 10, 30);
    const memberScore = Math.min(memberCount * 0.5, 30);
    const retentionScore = recentAttendance.length > 0
      ? recentAttendance.reduce((sum, event) => {
          const ratio = event._count.bookings > 0 ? event._count.attendances / event._count.bookings : 0;
          return sum + ratio;
        }, 0) / recentAttendance.length * 40
      : 20;

    const score = Math.round(activityScore + memberScore + retentionScore);
    await this.prisma.club.update({ where: { id: clubId }, data: { healthScore: score } });
    return score;
  }

  private combineDateTime(date?: Date, time?: string) {
    if (!date) return null;
    const [hours, minutes] = (time || '00:00').split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours || 0, minutes || 0, 0, 0);
    return combined;
  }
}
