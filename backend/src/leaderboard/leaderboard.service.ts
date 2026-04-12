import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Campus } from '@prisma/client';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getStudentLeaderboard(campus?: Campus, limit = 50) {
    const where: any = {};
    if (campus) where.campus = campus;
    const students = await this.prisma.user.findMany({
      where: { ...where, role: 'STUDENT', isActive: true },
      orderBy: [{ points: 'desc' }, { createdAt: 'asc' }],
      take: limit,
      include: {
        _count: { select: { bookings: true, certificates: true } },
      },
    });

    const ranked = students.map((student, index) => ({
      id: student.id,
      name: student.name,
      avatar: student.avatar,
      campus: student.campus,
      department: student.department,
      points: student.points,
      regNumber: student.regNumber,
      rank: index + 1,
      events_attended: student._count.bookings,
      certificates: student._count.certificates,
    }));

    // Get top 3 separately for podium
    const [first, second, third, ...rest] = ranked;
    return { podium: [first, second, third].filter(Boolean), rest: rest || [], total: students.length };
  }

  async getClubLeaderboard(campus?: Campus) {
    const clubs = await this.prisma.club.findMany({
      where: { isActive: true, ...(campus ? { campus } : {}) },
      orderBy: [{ points: 'desc' }, { healthScore: 'desc' }],
      take: 20,
      include: {
        members: { where: { isActive: true }, select: { id: true } },
        events: { where: { status: 'COMPLETED' }, select: { id: true } },
      },
    });

    return clubs.map((club, index) => ({
      id: club.id,
      name: club.name,
      logo: club.logo,
      campus: club.campus,
      category: club.category,
      points: club.points,
      healthScore: club.healthScore,
      rank: index + 1,
      member_count: club.members.length,
      events_hosted: club.events.length,
    }));
  }

  async getCampusLeaderboard() {
    const [studentGroups, completedEvents] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['campus'],
        where: { role: 'STUDENT', isActive: true, campus: { not: null } },
        _sum: { points: true },
        _count: { _all: true },
      }),
      this.prisma.event.groupBy({
        by: ['campus'],
        where: { status: 'COMPLETED' },
        _count: { _all: true },
      }),
    ]);

    const eventMap = new Map(completedEvents.map((entry) => [entry.campus, entry._count._all]));

    return studentGroups
      .map((entry) => ({
        campus: entry.campus,
        total_points: entry._sum.points || 0,
        student_count: entry._count._all,
        events_count: eventMap.get(entry.campus) || 0,
      }))
      .sort((a, b) => Number(b.total_points) - Number(a.total_points))
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  async getUserRank(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { campus: true, points: true },
    });
    if (!user) return null;

    const [globalRank, campusRank] = await Promise.all([
      this.prisma.user.count({ where: { points: { gt: user.points }, role: 'STUDENT' } }),
      user.campus
        ? this.prisma.user.count({ where: { points: { gt: user.points }, role: 'STUDENT', campus: user.campus } })
        : null,
    ]);

    return {
      globalRank: globalRank + 1,
      campusRank: campusRank !== null ? campusRank + 1 : null,
      points: user.points,
    };
  }

  async getPointHistory(userId: string) {
    return this.prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async awardPoints(userId: string, points: number, reason: string, referenceId?: string) {
    const [transaction] = await this.prisma.$transaction([
      this.prisma.pointTransaction.create({
        data: { userId, points, reason, referenceId },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { points: { increment: points } },
      }),
    ]);
    return transaction;
  }
}
