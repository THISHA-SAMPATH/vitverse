import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import bcrypt = require('bcryptjs');
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        campus: true,
        role: true,
        avatar: true,
        bio: true,
        department: true,
        year: true,
        regNumber: true,
        phone: true,
        points: true,
        streakDays: true,
        isVerified: true,
        updatedAt: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getMyClubs(userId: string) {
    return this.prisma.clubMember.findMany({
      where: { userId, isActive: true },
      select: {
        role: true,
        club: {
          select: {
            id: true,
            name: true,
            slug: true,
            campus: true,
            category: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async updateProfile(id: string, body: {
    name?: string;
    bio?: string;
    avatar?: string;
    department?: string;
    year?: number | string;
    phone?: string;
  }) {
    const yearValue = body.year === '' || body.year === undefined || body.year === null
      ? undefined
      : Number(body.year);

    return this.prisma.user.update({
      where: { id },
      data: {
        name: body.name,
        bio: body.bio,
        avatar: body.avatar,
        department: body.department,
        year: yearValue,
        phone: body.phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        campus: true,
        role: true,
        avatar: true,
        bio: true,
        department: true,
        year: true,
        regNumber: true,
        phone: true,
        points: true,
        streakDays: true,
        isVerified: true,
        updatedAt: true,
        createdAt: true,
      },
    });
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Current password and new password are required');
    }
    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { passwordHash: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return { message: 'Password updated successfully' };
  }

  async getNotifications(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return notifications.map((notification) => ({
      ...notification,
      read: notification.isRead,
    }));
  }

  async markNotificationsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, expiresAt: { gte: new Date() } },
      select: { id: true, device: true, ip: true, createdAt: true, expiresAt: true },
    });
  }

  async revokeSession(sessionId: string, userId: string) {
    return this.prisma.session.deleteMany({ where: { id: sessionId, userId } });
  }
}
