import { Injectable } from '@nestjs/common';
import { BookingStatus, Campus, EventStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getSuperAdminDashboard() {
    const monthlyWindowStart = new Date();
    monthlyWindowStart.setDate(1);
    monthlyWindowStart.setHours(0, 0, 0, 0);
    monthlyWindowStart.setMonth(monthlyWindowStart.getMonth() - 5);

    const [
      totalUsers,
      totalEvents,
      totalClubs,
      totalRegistrations,
      pendingEvents,
      pendingFoc,
      activeEvents,
      campusBreakdownRaw,
      recentEvents,
      topClubs,
      fraudAlerts,
      seatUtilization,
      ffcsStats,
      recentEventDates,
      recentBookingDates,
      recentUserDates,
      categoryBreakdownRaw,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.event.count(),
      this.prisma.club.count({ where: { isActive: true } }),
      this.prisma.booking.count({
        where: { status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.WAITLISTED] } },
      }),
      this.prisma.event.count({ where: { status: EventStatus.DRAFT } }),
      this.prisma.focActivity.count({ where: { status: 'PENDING' as any } }),
      this.prisma.event.count({ where: { status: { in: [EventStatus.PUBLISHED, EventStatus.LIVE] } } }),
      this.prisma.user.groupBy({ by: ['campus'], _count: true, where: { role: Role.STUDENT } }),
      this.prisma.event.findMany({
        where: { status: EventStatus.PUBLISHED },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          sessions: {
            orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
            take: 1,
            include: { venue: { select: { name: true } } },
          },
          _count: { select: { bookings: true, attendances: true } },
        },
      }),
      this.prisma.club.findMany({ orderBy: { points: 'desc' }, take: 5 }),
      this.detectFraudPatterns(),
      this.getSeatUtilizationReport(),
      this.prisma.focActivity.groupBy({ by: ['status'], _count: true }),
      this.prisma.event.findMany({
        where: { createdAt: { gte: monthlyWindowStart } },
        select: { createdAt: true },
      }),
      this.prisma.booking.findMany({
        where: { bookedAt: { gte: monthlyWindowStart } },
        select: { bookedAt: true },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: monthlyWindowStart }, isActive: true },
        select: { createdAt: true },
      }),
      this.prisma.event.findMany({
        where: { category: { isNot: null } },
        select: { category: { select: { name: true } } },
      }),
    ]);
    const campusBreakdown = campusBreakdownRaw.map((entry) => ({
      campus: entry.campus,
      _count: typeof (entry as any)._count === 'number' ? (entry as any)._count : (entry as any)._count?.campus || 0,
    }));

    const avgSeatUtilization = seatUtilization.length > 0
      ? Math.round(seatUtilization.reduce((sum, item) => sum + item.utilization, 0) / seatUtilization.length)
      : 0;
    const approvedFfcs = ffcsStats.find((item) => item.status === 'APPROVED')?._count || 0;
    const totalFfcs = ffcsStats.reduce((sum, item) => sum + item._count, 0);
    const ffcsCompletion = totalFfcs > 0 ? Math.round((approvedFfcs / totalFfcs) * 100) : 0;
    const monthlyStats = this.buildMonthlyStats(monthlyWindowStart, {
      events: recentEventDates,
      registrations: recentBookingDates.map((booking) => ({ createdAt: booking.bookedAt })),
      users: recentUserDates,
    });
    const categoryMap = categoryBreakdownRaw.reduce((acc, entry) => {
      const categoryName = entry.category?.name;
      if (!categoryName) return acc;
      acc[categoryName] = (acc[categoryName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const categoryBreakdown = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      totalUsers,
      totalEvents,
      totalClubs,
      totalRegistrations,
      pendingEvents,
      pendingFoc,
      activeEvents,
      avgSeatUtilization,
      ffcsCompletion,
      monthlyStats,
      categoryBreakdown,
      stats: { totalUsers, totalEvents, totalClubs, totalRegistrations },
      campusBreakdown,
      recentEvents: recentEvents.map((event) => ({
        ...event,
        venue: event.sessions[0]?.venue?.name,
        startDateTime: this.combineDateTime(event.sessions[0]?.sessionDate, event.sessions[0]?.startTime),
        _count: {
          registrations: event._count.bookings,
          attendances: event._count.attendances,
        },
      })),
      topClubs,
      fraudAlerts,
    };
  }

  async getCampusAnalytics(campus: Campus) {
    const [events, clubs, students, registrations] = await Promise.all([
      this.prisma.event.findMany({
        where: { campus, status: { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] } },
        include: {
          sessions: {
            orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
            take: 1,
            include: { venue: { select: { name: true } } },
          },
          _count: { select: { bookings: true, attendances: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.club.findMany({
        where: { campus },
        include: { _count: { select: { members: true, events: true } } },
      }),
      this.prisma.user.count({ where: { campus, role: Role.STUDENT } }),
      this.prisma.booking.count({
        where: {
          event: { campus },
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.WAITLISTED] },
        },
      }),
    ]);

    const avgAttendanceRate = events.length > 0
      ? events.reduce((sum, event) => {
          const rate = event._count.bookings > 0 ? event._count.attendances / event._count.bookings : 0;
          return sum + rate;
        }, 0) / events.length
      : 0;

    return {
      campus,
      events: events.map((event) => ({
        ...event,
        venue: event.sessions[0]?.venue?.name,
        startDateTime: this.combineDateTime(event.sessions[0]?.sessionDate, event.sessions[0]?.startTime),
        _count: {
          registrations: event._count.bookings,
          attendances: event._count.attendances,
        },
      })),
      clubs,
      students,
      registrations,
      avgAttendanceRate,
    };
  }

  async getAllUsers(filters: { role?: string; campus?: string; page?: number; limit?: number; search?: string }) {
    const { role, campus, page = 1, limit = 50, search } = filters;
    const where: any = {};
    if (role) where.role = role;
    if (campus) where.campus = campus;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { regNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          regNumber: true,
          campus: true,
          role: true,
          department: true,
          points: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async toggleUserStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });
  }

  async updateUserRole(userId: string, role: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { role: role as Role } });
  }

  async getSeatUtilizationReport() {
    const events = await this.prisma.event.findMany({
      where: { status: { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] } },
      include: {
        sessions: {
          orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
          include: {
            venue: { select: { name: true } },
            _count: { select: { seats: true, bookings: true } },
          },
        },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return events.map((event) => {
      const capacity = event.sessions.reduce((sum, session) => sum + session._count.seats, 0);
      const registered = event._count.bookings;
      return {
        eventId: event.id,
        title: event.title,
        campus: event.campus,
        venue: event.sessions[0]?.venue?.name,
        capacity,
        registered,
        utilization: capacity > 0 ? (registered / capacity) * 100 : 0,
      };
    });
  }

  async getClubPerformanceReport() {
    return this.prisma.club.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { members: true, events: true } },
        president: { select: { name: true } },
      },
      orderBy: { healthScore: 'desc' },
    });
  }

  async createAnnouncement(data: { title: string; content: string; campus?: Campus; authorId: string; pinned?: boolean }) {
    return this.prisma.announcement.create({ data });
  }

  async getAnnouncements(campus?: Campus) {
    return this.prisma.announcement.findMany({
      where: {
        AND: [
          { OR: [{ campus: campus || undefined }, { campus: null }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
        ],
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getFraudDetection() {
    return this.detectFraudPatterns();
  }

  async downloadReport(reportId: string, filters: { campus?: Campus; from?: string; to?: string }) {
    const rangeFilter = this.buildDateRangeFilter(filters.from, filters.to);

    switch (reportId) {
      case 'events-summary': {
        const events = await this.prisma.event.findMany({
          where: {
            ...(filters.campus && { campus: filters.campus }),
            ...(rangeFilter && { createdAt: rangeFilter }),
          },
          include: {
            sessions: {
              orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
              take: 1,
              include: { venue: { select: { name: true } } },
            },
            _count: { select: { bookings: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        return this.csvResponse(reportId, events.map((event) => ({
          id: event.id,
          title: event.title,
          campus: event.campus,
          status: event.status,
          venue: event.sessions[0]?.venue?.name || '',
          registrations: event._count.bookings,
          createdAt: event.createdAt.toISOString(),
        })));
      }
      case 'user-activity': {
        const users = await this.prisma.user.findMany({
          where: {
            ...(filters.campus && { campus: filters.campus }),
            ...(rangeFilter && { createdAt: rangeFilter }),
          },
          select: {
            id: true,
            name: true,
            email: true,
            campus: true,
            role: true,
            points: true,
            createdAt: true,
            _count: { select: { bookings: true, clubMemberships: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        return this.csvResponse(reportId, users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          campus: user.campus,
          role: user.role,
          points: user.points,
          bookings: user._count.bookings,
          clubs: user._count.clubMemberships,
          createdAt: user.createdAt.toISOString(),
        })));
      }
      case 'ffcs-credits': {
        const activities = await this.prisma.focActivity.findMany({
          where: {
            ...(rangeFilter && { createdAt: rangeFilter }),
            ...(filters.campus && { user: { campus: filters.campus } }),
          },
          include: {
            user: { select: { name: true, regNumber: true, campus: true } },
            club: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        return this.csvResponse(reportId, activities.map((activity) => ({
          student: activity.user.name,
          regNumber: activity.user.regNumber,
          campus: activity.user.campus,
          club: activity.club?.name || '',
          activityType: activity.activityType,
          semester: activity.semester,
          hours: activity.hours,
          credits: activity.credits,
          status: activity.status,
          createdAt: activity.createdAt.toISOString(),
        })));
      }
      case 'seat-utilization': {
        const rows = await this.getSeatUtilizationReport();
        const filteredRows = filters.campus ? rows.filter((row) => row.campus === filters.campus) : rows;
        return this.csvResponse(reportId, filteredRows);
      }
      case 'club-health': {
        const clubs = await this.getClubPerformanceReport();
        const filteredClubs = filters.campus ? clubs.filter((club) => club.campus === filters.campus) : clubs;
        return this.csvResponse(reportId, filteredClubs.map((club: any) => ({
          id: club.id,
          name: club.name,
          campus: club.campus,
          category: club.category,
          president: club.president?.name || '',
          members: club._count.members,
          events: club._count.events,
          healthScore: club.healthScore,
        })));
      }
      case 'campus-comparison': {
        const campuses = await this.prisma.user.groupBy({
          by: ['campus'],
          _count: true,
          where: { campus: { not: null } },
        });
        const eventGroups = await this.prisma.event.groupBy({
          by: ['campus'],
          _count: true,
        });
        const focGroups = await this.prisma.focActivity.groupBy({
          by: ['status'],
          _sum: { credits: true },
        });

        return this.csvResponse(reportId, campuses.map((campus) => ({
          campus: campus.campus,
          users: campus._count,
          events: eventGroups.find((eventGroup) => eventGroup.campus === campus.campus)?._count || 0,
          approvedFfcsCredits: focGroups
            .filter((group) => group.status === 'APPROVED')
            .reduce((sum, group) => sum + (group._sum.credits || 0), 0),
        })));
      }
      default:
        throw new Error('Unsupported report');
    }
  }

  private async detectFraudPatterns() {
    const suspicious = await this.prisma.user.findMany({
      where: {
        certificates: { some: {} },
        attendances: { none: {} },
      },
      select: { id: true, name: true, email: true, campus: true },
      take: 10,
    });

    return suspicious.map((user) => ({
      userId: user.id,
      name: user.name,
      email: user.email,
      campus: user.campus,
      reason: 'Has certificates but no attendance records',
    }));
  }

  private combineDateTime(date?: Date, time?: string) {
    if (!date) return null;
    const [hours, minutes] = (time || '00:00').split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours || 0, minutes || 0, 0, 0);
    return combined;
  }

  private buildDateRangeFilter(from?: string, to?: string) {
    if (!from && !to) return undefined;
    const range: { gte?: Date; lte?: Date } = {};
    if (from) range.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    return range;
  }

  private csvResponse(reportId: string, rows: Record<string, any>[]) {
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => escape(row[header])).join(',')),
    ].join('\n');

    return {
      filename: `${reportId}.csv`,
      contentType: 'text/csv',
      csv,
    };
  }

  private buildMonthlyStats(
    start: Date,
    datasets: {
      events: Array<{ createdAt: Date }>;
      registrations: Array<{ createdAt: Date }>;
      users: Array<{ createdAt: Date }>;
    },
  ) {
    const buckets = Array.from({ length: 6 }).map((_, index) => {
      const current = new Date(start);
      current.setMonth(start.getMonth() + index);
      return {
        key: `${current.getFullYear()}-${current.getMonth()}`,
        month: current.toLocaleString('en-US', { month: 'short' }),
        events: 0,
        registrations: 0,
        users: 0,
      };
    });

    const fill = (rows: Array<{ createdAt: Date }>, field: 'events' | 'registrations' | 'users') => {
      rows.forEach((row) => {
        const createdAt = new Date(row.createdAt);
        const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
        const bucket = buckets.find((entry) => entry.key === key);
        if (bucket) {
          bucket[field] += 1;
        }
      });
    };

    fill(datasets.events, 'events');
    fill(datasets.registrations, 'registrations');
    fill(datasets.users, 'users');

    return buckets.map(({ key, ...bucket }) => bucket);
  }
}
