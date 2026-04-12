import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { FocStatus, Role } from '@prisma/client';

export class CreateFocActivityDto {
  @IsOptional()
  @IsString()
  clubId?: string;

  @IsString()
  semester: string;

  @IsString()
  activityType: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  proofUrl?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  hours: number;
}

@Injectable()
export class FocService {
  constructor(private prisma: PrismaService) {}

  async getMyActivities(userId: string, semester?: string) {
    const where: any = { userId };
    if (semester) where.semester = semester;

    const activities = await this.prisma.focActivity.findMany({
      where,
      include: {
        club: { select: { name: true, logo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = this.computeSummary(activities);
    return { activities, summary };
  }

  async submitActivity(userId: string, dto: CreateFocActivityDto) {
    const CREDITS_PER_HOUR = 0.5;

    if (dto.clubId) {
      const membership = await this.prisma.clubMember.findUnique({
        where: { userId_clubId: { userId, clubId: dto.clubId } },
      });

      if (!membership?.isActive) {
        throw new BadRequestException('You can only log club activity for a club you are actively part of');
      }
    }

    const activity = await this.prisma.focActivity.create({
      data: {
        ...dto,
        userId,
        credits: dto.hours * CREDITS_PER_HOUR,
        status: FocStatus.PENDING,
      },
    });
    return activity;
  }

  async approveActivity(activityId: string, facultyId: string, note?: string) {
    const activity = await this.prisma.focActivity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');

    return this.prisma.focActivity.update({
      where: { id: activityId },
      data: {
        status: FocStatus.APPROVED,
        approvedById: facultyId,
        approvedAt: new Date(),
        facultyNote: note,
      },
    });
  }

  async rejectActivity(activityId: string, facultyId: string, note: string) {
    const activity = await this.prisma.focActivity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');

    return this.prisma.focActivity.update({
      where: { id: activityId },
      data: { status: FocStatus.REJECTED, approvedById: facultyId, facultyNote: note },
    });
  }

  async bulkApproveActivities(activityIds: string[], facultyId: string, note?: string) {
    if (activityIds.length === 0) {
      return { count: 0 };
    }

    const result = await this.prisma.focActivity.updateMany({
      where: { id: { in: activityIds }, status: FocStatus.PENDING },
      data: {
        status: FocStatus.APPROVED,
        approvedById: facultyId,
        approvedAt: new Date(),
        facultyNote: note,
      },
    });
    return { count: result.count };
  }

  async bulkRejectActivities(activityIds: string[], facultyId: string, note: string) {
    if (activityIds.length === 0) {
      return { count: 0 };
    }

    const result = await this.prisma.focActivity.updateMany({
      where: { id: { in: activityIds }, status: FocStatus.PENDING },
      data: {
        status: FocStatus.REJECTED,
        approvedById: facultyId,
        facultyNote: note,
      },
    });
    return { count: result.count };
  }

  async getPendingApprovals(facultyId: string, campus?: string) {
    return this.prisma.focActivity.findMany({
      where: { status: FocStatus.PENDING },
      include: {
        user: { select: { id: true, name: true, regNumber: true, campus: true, department: true } },
        club: { select: { name: true, logo: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getClubActivitiesForPresident(presidentId: string) {
    const clubs = await this.prisma.club.findMany({
      where: { presidentId },
      select: { id: true },
    });
    const clubIds = clubs.map((club) => club.id);
    if (clubIds.length === 0) return [];

    return this.prisma.focActivity.findMany({
      where: { clubId: { in: clubIds } },
      include: {
        user: { select: { id: true, name: true, regNumber: true, campus: true, department: true } },
        club: { select: { id: true, name: true, logo: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async generateFocReport(userId: string, semester: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, regNumber: true, campus: true, department: true, year: true },
    });

    const activities = await this.prisma.focActivity.findMany({
      where: { userId, semester, status: FocStatus.APPROVED },
      include: { club: { select: { name: true } } },
    });

    const totalHours = activities.reduce((sum, a) => sum + a.hours, 0);
    const totalCredits = activities.reduce((sum, a) => sum + a.credits, 0);
    const REQUIRED_CREDITS = 2;
    const status = totalCredits >= REQUIRED_CREDITS ? 'COMPLETE' : 'INCOMPLETE';

    return {
      user,
      semester,
      activities,
      totalHours,
      totalCredits,
      requiredCredits: REQUIRED_CREDITS,
      status,
      generatedAt: new Date(),
    };
  }

  async getSemesterProgress(userId: string) {
    const currentSemester = this.getCurrentSemester();
    const activities = await this.prisma.focActivity.findMany({
      where: { userId, semester: currentSemester },
    });

    const approved = activities.filter((a) => a.status === FocStatus.APPROVED);
    const pending = activities.filter((a) => a.status === FocStatus.PENDING);
    const rejected = activities.filter((a) => a.status === FocStatus.REJECTED);

    const earnedCredits = approved.reduce((sum, a) => sum + a.credits, 0);
    const REQUIRED = 2;

    return {
      semester: currentSemester,
      earnedCredits,
      requiredCredits: REQUIRED,
      percentComplete: Math.min((earnedCredits / REQUIRED) * 100, 100),
      status: earnedCredits >= REQUIRED ? 'COMPLETE' : 'IN_PROGRESS',
      breakdown: { approved: approved.length, pending: pending.length, rejected: rejected.length },
    };
  }

  private computeSummary(activities: any[]) {
    const approved = activities.filter((a) => a.status === 'APPROVED');
    return {
      total: activities.length,
      approved: approved.length,
      totalCredits: approved.reduce((sum, a) => sum + a.credits, 0),
      totalHours: approved.reduce((sum, a) => sum + a.hours, 0),
    };
  }

  private getCurrentSemester(): string {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const sem = month >= 7 ? 'Winter' : 'Summer';
    return `${sem} ${year}`;
  }
}
