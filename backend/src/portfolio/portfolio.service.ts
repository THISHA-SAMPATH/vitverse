import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  async getPortfolio(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        badges: true,
        certificates: {
          include: {
            event: {
              include: {
                sessions: {
                  orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
                  take: 1,
                },
              },
            },
          },
          orderBy: { issuedAt: 'desc' },
        },
        clubMemberships: {
          where: { isActive: true },
          include: { club: { select: { name: true, logo: true, category: true, campus: true } } },
        },
        attendances: {
          include: {
            event: {
              include: {
                sessions: {
                  orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
                  take: 1,
                },
              },
            },
          },
          orderBy: { scannedAt: 'desc' },
          take: 50,
        },
        pointTxns: { orderBy: { createdAt: 'desc' }, take: 20 },
        skillRadar: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const recentEvents = user.attendances.map((attendance) => ({
      ...attendance,
      event: {
        ...attendance.event,
        startDateTime: this.combineDateTime(
          attendance.event.sessions[0]?.sessionDate,
          attendance.event.sessions[0]?.startTime,
        ),
      },
    }));

    const certificates = user.certificates.map((certificate) => ({
      ...certificate,
      event: {
        title: certificate.event.title,
        campus: certificate.event.campus,
        startDateTime: this.combineDateTime(
          certificate.event.sessions[0]?.sessionDate,
          certificate.event.sessions[0]?.startTime,
        ),
      },
    }));

    const stats = {
      totalPoints: user.points,
      eventsAttended: recentEvents.length,
      clubsJoined: user.clubMemberships.length,
      certificatesEarned: user.certificates.length,
      badgesEarned: user.badges.length,
      streakDays: user.streakDays,
    };

    const tagFrequency: Record<string, number> = {};
    recentEvents.forEach((attendance) => {
      attendance.event.tags?.forEach((tag) => {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
      });
    });

    const topInterests = Object.entries(tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        campus: user.campus,
        department: user.department,
        year: user.year,
        avatar: user.avatar,
        bio: user.bio,
        phone: user.phone,
        regNumber: user.regNumber,
      },
      stats,
      skillRadar: user.skillRadar,
      topInterests,
      certificates,
      badges: user.badges,
      clubs: user.clubMemberships,
      recentEvents,
      pointHistory: user.pointTxns,
    };
  }

  async updateProfile(userId: string, data: {
    name?: string;
    bio?: string;
    avatar?: string;
    phone?: string;
    department?: string;
    year?: number;
  }) {
    const { name, bio, avatar, phone, department, year } = data;
    return this.prisma.user.update({
      where: { id: userId },
      data: { name, bio, avatar, phone, department, year },
    });
  }

  async updateSkillRadar(userId: string, skills: {
    technical?: number;
    leadership?: number;
    management?: number;
    creative?: number;
    social?: number;
  }) {
    return this.prisma.skillRadar.upsert({
      where: { userId },
      create: { userId, ...skills },
      update: skills,
    });
  }

  async getPublicProfile(userId: string) {
    const portfolio = await this.getPortfolio(userId);
    const { user, stats, skillRadar, topInterests, certificates, badges, clubs } = portfolio;
    return { user: { ...user, email: undefined }, stats, skillRadar, topInterests, certificates, badges, clubs };
  }

  async generateResumeData(userId: string) {
    const portfolio = await this.getPortfolio(userId);
    return {
      personalInfo: portfolio.user,
      summary: `${portfolio.user.name} is a ${portfolio.user.department} student with ${portfolio.stats.eventsAttended} event participations, ${portfolio.stats.clubsJoined} club memberships, and ${portfolio.stats.certificatesEarned} certificates.`,
      achievements: portfolio.badges.map((badge) => badge.label),
      events: portfolio.recentEvents.slice(0, 10).map((attendance) => ({
        name: attendance.event.title,
        date: attendance.event.startDateTime,
        campus: attendance.event.campus,
      })),
      clubs: portfolio.clubs.map((membership) => ({
        name: membership.club.name,
        role: membership.role,
        category: membership.club.category,
      })),
      certificates: portfolio.certificates.map((certificate) => ({
        event: certificate.event.title,
        type: certificate.type,
        date: certificate.issuedAt,
        verified: certificate.verified,
        hash: certificate.hash,
      })),
      skills: portfolio.topInterests,
      points: portfolio.stats.totalPoints,
    };
  }

  async updateStreakAndBadges(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const lastActive = user.lastActiveAt;
    const now = new Date();
    let newStreak = user.streakDays;

    if (lastActive) {
      const daysDiff = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) newStreak += 1;
      else if (daysDiff > 1) newStreak = 1;
    } else {
      newStreak = 1;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { streakDays: newStreak, lastActiveAt: now },
    });

    if (newStreak === 7) {
      await this.prisma.userBadge.upsert({
        where: { userId_type_label: { userId, type: 'STREAK', label: '7-Day Streak' } },
        create: { userId, type: 'STREAK', label: '7-Day Streak' },
        update: {},
      });
    }

    if (newStreak === 30) {
      await this.prisma.userBadge.upsert({
        where: { userId_type_label: { userId, type: 'STREAK', label: '30-Day Streak' } },
        create: { userId, type: 'STREAK', label: '30-Day Streak' },
        update: {},
      });
    }
  }

  private combineDateTime(date?: Date, time?: string) {
    if (!date) return null;
    const [hours, minutes] = (time || '00:00').split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours || 0, minutes || 0, 0, 0);
    return combined;
  }
}
