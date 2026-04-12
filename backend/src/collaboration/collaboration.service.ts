import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Role } from '@prisma/client';

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
type MeetingStatus = 'upcoming' | 'completed';

export interface ClubTask {
  id: string;
  title: string;
  clubId?: string;
  clubName?: string;
  assigneeId?: string;
  assignee?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: TaskStatus;
  due?: string;
  completionNote?: string;
  completedAt?: string;
  completedById?: string;
  createdAt: string;
}

export interface ClubMessage {
  id: string;
  channelId: string;
  authorId: string;
  author: string;
  avatar: string;
  text: string;
  createdAt: string;
}

export interface ClubMeeting {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  venue?: string;
  link?: string;
  agenda?: string;
  attendees: number;
  status: MeetingStatus;
  createdAt: string;
}

interface ClubStore {
  tasks: ClubTask[];
  messages: ClubMessage[];
  meetings: ClubMeeting[];
}

interface CollaborationStore {
  clubs: Record<string, ClubStore>;
}

const DEFAULT_CHANNELS = [
  { id: 'general', name: 'general', description: 'General club discussion' },
  { id: 'events', name: 'events', description: 'Event planning & updates' },
  { id: 'ffcs', name: 'ffcs', description: 'FFCS credits & activities' },
  { id: 'announcements', name: 'announcements', description: 'Important announcements' },
];

@Injectable()
export class CollaborationService {
  private readonly storePath = path.join(process.cwd(), 'data', 'collaboration-store.json');

  constructor(private readonly prisma: PrismaService) {}

  async getTasksForUser(userId: string, role: Role, clubId?: string) {
    if (role === Role.CLUB_PRESIDENT) {
      const { clubId: resolvedClubId, clubName } = await this.getClubContext(userId, true, clubId);
      const store = await this.getClubStore(resolvedClubId);
      return this.sortTasks(store.tasks).map((task) => ({
        ...task,
        clubId: resolvedClubId,
        clubName,
      }));
    }

    const clubs = await this.getAccessibleClubs(userId, clubId);
    const tasks = await Promise.all(clubs.map(async (club) => {
      const store = await this.getClubStore(club.id);
      return store.tasks
        .filter((task) => task.assigneeId === userId)
        .map((task) => ({
          ...task,
          clubId: club.id,
          clubName: club.name,
        }));
    }));

    return this.sortTasks(tasks.flat());
  }

  async createTask(presidentId: string, clubId: string | undefined, payload: Omit<ClubTask, 'id' | 'status' | 'createdAt'>) {
    const { clubId: resolvedClubId, clubName, members } = await this.getClubContext(presidentId, true, clubId);
    const store = await this.readStore();

    if (payload.assigneeId && !members.some((member) => member.userId === payload.assigneeId)) {
      throw new BadRequestException('Task assignee must be a club member');
    }

    const task: ClubTask = {
      id: this.makeId('task'),
      title: payload.title,
      clubId: resolvedClubId,
      clubName,
      assigneeId: payload.assigneeId,
      assignee: payload.assignee,
      priority: payload.priority,
      due: payload.due,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const clubStore = this.ensureClubStore(store, resolvedClubId);
    clubStore.tasks.unshift(task);
    await this.writeStore(store);
    return task;
  }

  async updateTaskStatus(userId: string, role: Role, taskId: string, status: TaskStatus, clubId?: string, completionNote?: string) {
    if (!['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      throw new BadRequestException('Invalid task status');
    }

    const store = await this.readStore();
    const candidateClubIds = role === Role.CLUB_PRESIDENT
      ? [(await this.getClubContext(userId, true, clubId)).clubId]
      : (await this.getAccessibleClubs(userId, clubId)).map((club) => club.id);

    let task: ClubTask | undefined;
    for (const candidateClubId of candidateClubIds) {
      const clubStore = this.ensureClubStore(store, candidateClubId);
      const matchedTask = clubStore.tasks.find((entry) => entry.id === taskId);
      if (matchedTask) {
        task = matchedTask;
        break;
      }
    }

    if (!task) throw new NotFoundException('Task not found');
    if (role !== Role.CLUB_PRESIDENT && task.assigneeId !== userId) {
      throw new ForbiddenException('You can only update tasks assigned to you');
    }
    if (role !== Role.CLUB_PRESIDENT && status === 'COMPLETED' && !completionNote?.trim()) {
      throw new BadRequestException('Please add a completion update before submitting the task as completed');
    }

    task.status = status;
    if (status === 'COMPLETED') {
      task.completionNote = completionNote?.trim() || task.completionNote;
      task.completedAt = new Date().toISOString();
      task.completedById = userId;
    } else if (role !== Role.CLUB_PRESIDENT) {
      task.completionNote = undefined;
      task.completedAt = undefined;
      task.completedById = undefined;
    }

    await this.writeStore(store);
    return task;
  }

  async getChannelsForPresident(presidentId: string, clubId?: string) {
    const { clubId: resolvedClubId } = await this.getClubContext(presidentId, false, clubId);
    const store = await this.getClubStore(resolvedClubId);
    return DEFAULT_CHANNELS.map((channel) => ({
      ...channel,
      count: store.messages.filter((message) => message.channelId === channel.id).length,
    }));
  }

  async getMessagesForPresident(presidentId: string, channelId: string, clubId?: string) {
    const { clubId: resolvedClubId } = await this.getClubContext(presidentId, false, clubId);
    if (!DEFAULT_CHANNELS.some((channel) => channel.id === channelId)) {
      throw new NotFoundException('Channel not found');
    }
    const store = await this.getClubStore(resolvedClubId);
    return store.messages
      .filter((message) => message.channelId === channelId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async postMessage(presidentId: string, channelId: string, text: string, clubId?: string) {
    const { clubId: resolvedClubId, user } = await this.getClubContext(presidentId, false, clubId);
    if (!DEFAULT_CHANNELS.some((channel) => channel.id === channelId)) {
      throw new NotFoundException('Channel not found');
    }

    const store = await this.readStore();
    const clubStore = this.ensureClubStore(store, resolvedClubId);
    const message: ClubMessage = {
      id: this.makeId('msg'),
      channelId,
      authorId: user.id,
      author: user.name,
      avatar: user.name?.charAt(0)?.toUpperCase() || 'U',
      text,
      createdAt: new Date().toISOString(),
    };
    clubStore.messages.push(message);
    await this.writeStore(store);
    return message;
  }

  async getMeetingsForPresident(presidentId: string, clubId?: string) {
    const { clubId: resolvedClubId } = await this.getClubContext(presidentId, false, clubId);
    const store = await this.getClubStore(resolvedClubId);
    return store.meetings
      .map((meeting) => ({
        ...meeting,
        status: this.computeMeetingStatus(meeting.date) as MeetingStatus,
      }))
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }

  async createMeeting(
    presidentId: string,
    clubId: string | undefined,
    payload: Omit<ClubMeeting, 'id' | 'attendees' | 'status' | 'createdAt'>,
  ) {
    const { clubId: resolvedClubId, memberCount } = await this.getClubContext(presidentId, true, clubId);
    const store = await this.readStore();
    const clubStore = this.ensureClubStore(store, resolvedClubId);
    const meeting: ClubMeeting = {
      id: this.makeId('meet'),
      title: payload.title,
      date: payload.date,
      time: payload.time,
      type: payload.type,
      venue: payload.venue,
      link: payload.link,
      agenda: payload.agenda,
      attendees: memberCount,
      status: this.computeMeetingStatus(payload.date),
      createdAt: new Date().toISOString(),
    };

    clubStore.meetings.push(meeting);
    await this.writeStore(store);
    return meeting;
  }

  private computeMeetingStatus(date: string): MeetingStatus {
    const today = new Date();
    const compare = new Date(date);
    compare.setHours(23, 59, 59, 999);
    return compare >= today ? 'upcoming' : 'completed';
  }

  private async getClubContext(userId: string, requirePresident = false, requestedClubId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const membershipWhere = requirePresident
      ? { id: requestedClubId, presidentId: userId }
      : {
          id: requestedClubId,
          OR: [
            { presidentId: userId },
            { members: { some: { userId, isActive: true } } },
          ],
        };

    const club = await this.prisma.club.findFirst({
      where: requestedClubId
        ? membershipWhere
        : requirePresident
          ? { presidentId: userId }
          : {
              OR: [
                { presidentId: userId },
                { members: { some: { userId, isActive: true } } },
              ],
            },
      include: {
        members: {
          where: { isActive: true },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    if (!club) {
      throw new ForbiddenException(requirePresident ? 'President club not found' : 'No active club membership found');
    }

    return {
      clubId: club.id,
      clubName: club.name,
      members: club.members.map((member) => ({
        userId: member.userId,
        name: member.user?.name || '',
      })),
      memberCount: club.members.length,
      user,
    };
  }

  private async getAccessibleClubs(userId: string, requestedClubId?: string) {
    const clubs = await this.prisma.club.findMany({
      where: requestedClubId
        ? {
            id: requestedClubId,
            OR: [
              { presidentId: userId },
              { members: { some: { userId, isActive: true } } },
            ],
          }
        : {
            OR: [
              { presidentId: userId },
              { members: { some: { userId, isActive: true } } },
            ],
          },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    if (clubs.length === 0) {
      throw new ForbiddenException('No active club membership found');
    }

    return clubs;
  }

  private sortTasks(tasks: ClubTask[]) {
    return tasks.sort((a, b) => {
      const aDue = a.due || '9999-12-31';
      const bDue = b.due || '9999-12-31';
      return aDue.localeCompare(bDue);
    });
  }

  private async getClubStore(clubId: string) {
    const store = await this.readStore();
    return this.ensureClubStore(store, clubId);
  }

  private async readStore(): Promise<CollaborationStore> {
    await fs.mkdir(path.dirname(this.storePath), { recursive: true });
    try {
      const raw = await fs.readFile(this.storePath, 'utf8');
      const parsed = JSON.parse(raw) as CollaborationStore;
      return parsed?.clubs ? parsed : { clubs: {} };
    } catch {
      const initial = { clubs: {} };
      await this.writeStore(initial);
      return initial;
    }
  }

  private async writeStore(store: CollaborationStore) {
    await fs.mkdir(path.dirname(this.storePath), { recursive: true });
    await fs.writeFile(this.storePath, JSON.stringify(store, null, 2), 'utf8');
  }

  private ensureClubStore(store: CollaborationStore, clubId: string) {
    if (!store.clubs[clubId]) {
      store.clubs[clubId] = { tasks: [], messages: [], meetings: [] };
    }
    return store.clubs[clubId];
  }

  private makeId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
