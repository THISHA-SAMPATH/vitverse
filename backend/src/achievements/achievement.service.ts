import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

export const ACHIEVEMENT_DEFINITIONS = {
  FIRST_BOOKING:    { name: 'First Steps',        icon: '🎟️', points: 50,  description: 'Made your first event booking!',                    category: 'booking' },
  FIVE_BOOKINGS:    { name: 'Event Enthusiast',   icon: '🌟', points: 100, description: 'Booked 5 events on VITVerse.',                       category: 'booking' },
  TEN_BOOKINGS:     { name: 'Campus Legend',      icon: '👑', points: 200, description: 'Booked 10 events — you are a VIT legend!',           category: 'booking' },
  FIRST_PAYMENT:    { name: 'Paid It Forward',    icon: '💳', points: 75,  description: 'Completed your first paid booking.',                  category: 'booking' },
  EARLY_BIRD:       { name: 'Early Bird',         icon: '🐦', points: 30,  description: 'Booked within 24 hours of an event going live.',      category: 'special' },
  PROFILE_COMPLETE: { name: 'Identity Confirmed', icon: '✅', points: 25,  description: 'Completed your full profile.',                        category: 'social'  },
  VETERAN:          { name: 'VIT Veteran',        icon: '🎖️', points: 150, description: 'Attended your first event — QR scanned at venue.',   category: 'attendance' },
  TEAM_PLAYER:      { name: 'Team Player',        icon: '🤝', points: 40,  description: 'Registered as part of a team.',                       category: 'social'  },
  NIGHT_OWL:        { name: 'Night Owl',          icon: '🦉', points: 20,  description: 'Booked an event between midnight and 6 AM.',          category: 'special' },
  STREAK_7:         { name: 'Weekly Warrior',     icon: '🔥', points: 60,  description: 'Active on VITVerse for 7 days in a row.',             category: 'streak'  },
  STREAK_30:        { name: 'Monthly Master',     icon: '💎', points: 250, description: 'Active for 30 days straight.',                        category: 'streak'  },
  CROSS_CAMPUS:     { name: 'Campus Explorer',    icon: '🗺️', points: 120, description: 'Attended events at 2 different VIT campuses.',        category: 'special' },
  WINNER:           { name: 'Champion',           icon: '🏆', points: 300, description: 'Won first place at a VIT event.',                     category: 'achievement' },
  VOLUNTEER:        { name: 'Volunteer Hero',     icon: '🦸', points: 100, description: 'Volunteered at 3 or more events.',                    category: 'social'  },
};

@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  /**
   * Unlock an achievement (idempotent — safe to call multiple times)
   */
  async unlock(userId: string, achievementKey: string): Promise<boolean> {
    const def = ACHIEVEMENT_DEFINITIONS[achievementKey as keyof typeof ACHIEVEMENT_DEFINITIONS];
    if (!def) return false;

    try {
      // Check if already unlocked
      const existing = await this.prisma.userAchievement.findUnique({
        where: { userId_achievementKey: { userId, achievementKey } },
      });
      if (existing) return false;

      // Get or create achievement record
      let achievement = await this.prisma.achievement.findUnique({ where: { key: achievementKey } });
      if (!achievement) {
        achievement = await this.prisma.achievement.create({
          data: { key: achievementKey, ...def },
        });
      }

      // Unlock
      await this.prisma.userAchievement.create({
        data: { userId, achievementId: achievement.id, achievementKey },
      });

      // Award points
      await this.prisma.$transaction([
        this.prisma.pointTransaction.create({
          data: { userId, points: def.points, reason: `Achievement: ${def.name}`, referenceId: achievementKey },
        }),
        this.prisma.user.update({
          where: { id: userId },
          data: { points: { increment: def.points } },
        }),
      ]);

      // In-app notification
      await this.prisma.notification.create({
        data: {
          userId,
          type: 'ACHIEVEMENT_UNLOCKED',
          title: `🏆 Achievement Unlocked: ${def.icon} ${def.name}`,
          message: `${def.description} You earned +${def.points} points!`,
        },
      });

      // Email
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
      if (user) {
        this.email.sendAchievementUnlocked(user, def).catch(() => {});
      }

      this.logger.log(`🏆 ${achievementKey} unlocked for user ${userId}`);
      return true;
    } catch (err) {
      this.logger.warn(`Achievement unlock error: ${err.message}`);
      return false;
    }
  }

  /**
   * Check and unlock achievements based on trigger
   */
  async check(userId: string, trigger: string, meta: Record<string, any> = {}): Promise<void> {
    try {
      switch (trigger) {
        case 'booking_created': {
          await this.unlock(userId, 'FIRST_BOOKING');

          const count = await this.prisma.booking.count({
            where: { userId, status: 'CONFIRMED' },
          });
          if (count >= 5) await this.unlock(userId, 'FIVE_BOOKINGS');
          if (count >= 10) await this.unlock(userId, 'TEN_BOOKINGS');

          // Night owl
          const hour = new Date().getHours();
          if (hour >= 0 && hour < 6) await this.unlock(userId, 'NIGHT_OWL');

          // Early bird
          if (meta.eventPublishedAt) {
            const hoursSince = (Date.now() - new Date(meta.eventPublishedAt).getTime()) / 3600000;
            if (hoursSince <= 24) await this.unlock(userId, 'EARLY_BIRD');
          }

          // Cross campus
          if (meta.eventCampus) {
            const distinctCampuses = await this.prisma.booking.findMany({
              where: { userId, status: 'CONFIRMED' },
              select: { event: { select: { campus: true } } },
              distinct: ['eventId'],
            });
            const campusSet = new Set(distinctCampuses.map((b) => b.event.campus));
            if (campusSet.size >= 2) await this.unlock(userId, 'CROSS_CAMPUS');
          }
          break;
        }

        case 'payment_made':
          await this.unlock(userId, 'FIRST_PAYMENT');
          break;

        case 'profile_updated': {
          const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, phone: true, avatar: true },
          });
          if (user?.name && user?.phone && user?.avatar) {
            await this.unlock(userId, 'PROFILE_COMPLETE');
          }
          break;
        }

        case 'qr_scanned':
          await this.unlock(userId, 'VETERAN');
          break;

        case 'team_joined':
          await this.unlock(userId, 'TEAM_PLAYER');
          break;

        case 'streak_7':
          await this.unlock(userId, 'STREAK_7');
          break;

        case 'streak_30':
          await this.unlock(userId, 'STREAK_30');
          break;

        case 'event_won':
          await this.unlock(userId, 'WINNER');
          break;

        default:
          break;
      }
    } catch (err) {
      this.logger.warn(`Achievement check error: ${err.message}`);
    }
  }

  async getUserAchievements(userId: string) {
    const unlocked = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });

    const totalPoints = unlocked.reduce((sum, ua) => sum + (ua.achievement?.points || 0), 0);

    const allDefs = Object.entries(ACHIEVEMENT_DEFINITIONS).map(([key, def]) => ({
      key,
      ...def,
      unlocked: unlocked.some((ua) => ua.achievementKey === key),
      unlockedAt: unlocked.find((ua) => ua.achievementKey === key)?.unlockedAt,
    }));

    return { unlocked: unlocked.map((ua) => ua.achievement), totalPoints, all: allDefs };
  }

  async getLeaderboard(limit = 20) {
    return this.prisma.user.findMany({
      where: { isActive: true },
      orderBy: { points: 'desc' },
      take: limit,
      select: { id: true, name: true, avatar: true, campus: true, department: true, points: true, regNumber: true },
    });
  }
}
