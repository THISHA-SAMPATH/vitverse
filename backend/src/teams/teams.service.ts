import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  private async resolveEvent(eventIdOrSlug: string) {
    return this.prisma.event.findFirst({
      where: {
        OR: [
          { id: eventIdOrSlug },
          { slug: eventIdOrSlug },
        ],
      },
    });
  }

  private async attachEvents<T extends { eventId: string }>(teams: T[]) {
    const eventIds = [...new Set(teams.map((team) => team.eventId))];
    const events = await this.prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: { id: true, title: true, slug: true, teamSize: true },
    });
    const eventMap = new Map(events.map((event) => [event.id, event]));
    return teams.map((team) => ({
      ...team,
      event: eventMap.get(team.eventId) || null,
    }));
  }

  async myTeams(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
            creator: { select: { id: true, name: true } },
          },
        },
      },
    });
    return this.attachEvents(memberships.map((m) => m.team));
  }

  async createTeam(dto: { name: string; eventId: string }, userId: string) {
    const event = await this.resolveEvent(dto.eventId.trim());
    if (!event) throw new NotFoundException('Event not found');
    if (!event.isTeamEvent) throw new BadRequestException('This event does not support team registration');

    const existing = await this.prisma.team.findFirst({
      where: { eventId: event.id, members: { some: { userId } } },
    });
    if (existing) throw new ConflictException('You already have a team for this event');

    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        eventId: event.id,
        creatorId: userId,
        members: { create: { userId, role: 'Captain' } },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
    });
    return { ...team, event: { id: event.id, title: event.title, slug: event.slug, teamSize: event.teamSize } };
  }

  async joinTeam(inviteCode: string, userId: string) {
    const team = await this.prisma.team.findUnique({
      where: { inviteCode },
      include: { members: true },
    });
    if (!team) throw new NotFoundException('Invalid invite code');

    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: team.id, userId } },
    });
    if (existing) throw new ConflictException('Already in this team');

    const event = await this.prisma.event.findUnique({ where: { id: team.eventId } });
    if (event && team.members.length >= (event.teamSize || 5)) {
      throw new BadRequestException('Team is full');
    }

    const membership = await this.prisma.teamMember.create({
      data: { teamId: team.id, userId, role: 'Member' },
      include: { team: { include: { members: { include: { user: { select: { id: true, name: true } } } } } } },
    });
    return {
      ...membership,
      team: {
        ...membership.team,
        event: event ? { id: event.id, title: event.title, slug: event.slug, teamSize: event.teamSize } : null,
      },
    };
  }

  async getTeam(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        creator: { select: { id: true, name: true } },
      },
    });
    if (!team) throw new NotFoundException('Team not found');
    const event = await this.prisma.event.findUnique({
      where: { id: team.eventId },
      select: { id: true, title: true, slug: true, teamSize: true },
    });
    return { ...team, event };
  }
}
