import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { EventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiKey = config.get<string>('openai.apiKey');
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
    if (!this.openai) {
      this.logger.warn('OPENAI_API_KEY is not configured. AI endpoints will use safe fallbacks.');
    }
  }

  async getEventRecommendations(userId: string, limit = 10) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        bookings: {
          include: { event: { select: { tags: true, title: true } } },
          take: 20,
          orderBy: { bookedAt: 'desc' },
        },
        clubMemberships: {
          include: { club: { select: { category: true, name: true } } },
          where: { isActive: true },
        },
      },
    });

    if (!user) return [];

    const pastTags = user.bookings.flatMap((booking) => booking.event.tags || []);
    const clubCategories = user.clubMemberships.map((membership) => membership.club.category);
    const interestProfile = [...new Set([...pastTags, ...clubCategories])].join(', ');

    const upcomingEvents = await this.prisma.event.findMany({
      where: {
        status: EventStatus.PUBLISHED,
        campus: user.campus || undefined,
        sessions: { some: { sessionDate: { gte: this.startOfToday() } } },
        bookings: { none: { userId } },
      },
      take: 50,
      include: {
        sessions: {
          orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (upcomingEvents.length === 0 || !this.openai) {
      return upcomingEvents.slice(0, limit).map((event) => this.serializeEvent(event));
    }

    const eventList = upcomingEvents
      .map((event, index) => `${index}: ${event.title} (${event.tags?.join(', ') || 'general'})`)
      .join('\n');

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.get<string>('openai.model') || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an event recommendation engine. Return ONLY a JSON array of event indices in order of relevance, like [3,1,7].',
          },
          {
            role: 'user',
            content: `User interests: ${interestProfile || 'general'}\nUser department: ${user.department || 'unknown'}\n\nRank these events:\n${eventList}\n\nReturn top ${limit} indices as JSON array.`,
          },
        ],
        max_tokens: 200,
      });

      const indices = JSON.parse(response.choices[0].message.content || '[]') as number[];
      return indices
        .slice(0, limit)
        .map((index) => upcomingEvents[index])
        .filter(Boolean)
        .map((event) => this.serializeEvent(event));
    } catch (err: any) {
      this.logger.error('AI recommendation failed, falling back to recent events', err?.message);
      return upcomingEvents.slice(0, limit).map((event) => this.serializeEvent(event));
    }
  }

  async extractPosterInfo(imageBase64: string): Promise<{
    title?: string;
    venue?: string;
    date?: string;
    club?: string;
    deadline?: string;
    description?: string;
    tags?: string[];
  }> {
    if (!this.openai) return {};

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.get<string>('openai.model') || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Extract structured event info and return ONLY valid JSON with fields: title, venue, date, club, deadline, description, tags.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract event information from this poster:' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        max_tokens: 500,
      });

      const text = response.choices[0].message.content || '{}';
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (err: any) {
      this.logger.error('Poster OCR failed', err?.message);
      return {};
    }
  }

  async chat(query: string, userId: string, campus?: string): Promise<string> {
    const [events, clubs] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          status: EventStatus.PUBLISHED,
          ...(campus ? { campus: campus as any } : {}),
          sessions: { some: { sessionDate: { gte: this.startOfToday() } } },
          OR: [
            { title: { contains: query.split(' ').slice(0, 3).join(' '), mode: 'insensitive' } },
            { description: { contains: query.split(' ').slice(0, 3).join(' '), mode: 'insensitive' } },
          ],
        },
        take: 5,
        include: {
          club: { select: { name: true } },
          sessions: {
            orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
            take: 1,
            include: { venue: { select: { name: true } } },
          },
        },
      }),
      this.prisma.club.findMany({
        where: {
          isActive: true,
          ...(campus ? { campus: campus as any } : {}),
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 3,
      }),
    ]);

    const context = [
      events.length > 0
        ? `UPCOMING EVENTS:\n${events
            .map((event) => {
              const session = event.sessions[0];
              return `- ${event.title} | ${session?.venue?.name || 'TBA'} | ${session?.sessionDate?.toLocaleDateString() || 'TBA'} | By: ${event.club?.name || 'VITVerse'}`;
            })
            .join('\n')}`
        : '',
      clubs.length > 0
        ? `RELEVANT CLUBS:\n${clubs.map((club) => `- ${club.name} | ${club.campus} | ${club.category}`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    if (!this.openai) {
      return context
        ? `Here is what I found.\n\n${context}`
        : 'VITBot is unavailable right now because the OpenAI key is not configured.';
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.get<string>('openai.model') || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are VITBot for VITVerse. Be concise, friendly, and accurate. Campus: ${campus || 'All campuses'}.`,
          },
          {
            role: 'user',
            content: context ? `Context:\n${context}\n\nQuestion: ${query}` : query,
          },
        ],
        max_tokens: 400,
      });

      return response.choices[0].message.content || 'Sorry, I could not process your query. Please try again.';
    } catch (err: any) {
      this.logger.error('Chatbot failed', err?.message);
      return 'VITBot is temporarily unavailable. Please check the events page directly.';
    }
  }

  async detectConflicts(eventData: {
    title: string;
    campus: string;
    startDateTime: Date;
    endDateTime: Date;
    tags: string[];
  }): Promise<{ hasConflict: boolean; conflicts: any[]; warningMessage?: string }> {
    const targetDate = new Date(eventData.startDateTime);
    targetDate.setHours(0, 0, 0, 0);

    const sessions = await this.prisma.eventSession.findMany({
      where: {
        sessionDate: targetDate,
        event: {
          campus: eventData.campus as any,
          status: { in: [EventStatus.PUBLISHED, EventStatus.LIVE] },
        },
      },
      include: {
        event: {
          select: { title: true, campus: true, tags: true, _count: { select: { bookings: true } } },
        },
      },
    });

    const conflicts = sessions
      .filter((session) => this.overlaps(session.startTime, session.endTime, eventData.startDateTime, eventData.endDateTime))
      .map((session) => ({
        title: session.event.title,
        campus: session.event.campus,
        startDateTime: this.combineDateTime(session.sessionDate, session.startTime),
        tags: session.event.tags,
        _count: { registrations: session.event._count.bookings },
      }));

    if (conflicts.length === 0) return { hasConflict: false, conflicts: [] };

    const similarType = conflicts.filter((conflict) => conflict.tags?.some((tag: string) => eventData.tags?.includes(tag)));
    let warningMessage = `${conflicts.length} event(s) are already scheduled at ${eventData.campus} during this time.`;
    if (similarType.length > 0) {
      warningMessage += ` Similar events found: ${similarType.map((conflict) => conflict.title).join(', ')}.`;
    }

    return { hasConflict: true, conflicts, warningMessage };
  }

  async semanticSearch(query: string, campus?: string) {
    const fallbackIntent = {
      keywords: query.split(/\s+/).filter(Boolean).slice(0, 5),
      category: 'both',
      skills: [],
    };

    let intent = fallbackIntent;

    if (this.openai) {
      try {
        const intentResponse = await this.openai.chat.completions.create({
          model: this.config.get<string>('openai.model') || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Extract search keywords and category from the user query. Return JSON: { keywords: string[], category: "event"|"club"|"both", skills: string[] }',
            },
            { role: 'user', content: query },
          ],
          max_tokens: 150,
        });

        intent = JSON.parse(
          (intentResponse.choices[0].message.content || '{}').replace(/```json|```/g, '').trim(),
        );
      } catch (err: any) {
        this.logger.error('Semantic search intent extraction failed', err?.message);
      }
    }

    const results: any = {};

    if (intent.category !== 'club') {
      results.events = (await this.prisma.event.findMany({
        where: {
          status: EventStatus.PUBLISHED,
          ...(campus ? { campus: campus as any } : {}),
          sessions: { some: { sessionDate: { gte: this.startOfToday() } } },
          OR: intent.keywords?.map((keyword: string) => ({
            OR: [
              { title: { contains: keyword, mode: 'insensitive' } },
              { description: { contains: keyword, mode: 'insensitive' } },
              { tags: { has: keyword.toLowerCase() } },
            ],
          })) || [],
        },
        take: 5,
        include: {
          sessions: {
            orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
            take: 1,
            include: { venue: { select: { name: true } } },
          },
          _count: { select: { bookings: true, attendances: true } },
        },
      })).map((event) => this.serializeEvent(event));
    }

    if (intent.category !== 'event') {
      results.clubs = await this.prisma.club.findMany({
        where: {
          isActive: true,
          ...(campus ? { campus: campus as any } : {}),
          OR: ([
            ...((intent.keywords?.map((keyword: string) => ({ name: { contains: keyword, mode: 'insensitive' as const } })) || []) as any[]),
            ...((intent.skills?.map((skill: string) => ({ category: { contains: skill, mode: 'insensitive' as const } })) || []) as any[]),
          ] as any),
        },
        take: 5,
      });
    }

    return { query, intent, results };
  }

  private serializeEvent(event: any) {
    const session = event.sessions?.[0];
    return {
      ...event,
      venue: session?.venue?.name,
      startDateTime: session ? this.combineDateTime(session.sessionDate, session.startTime) : null,
      endDateTime: session ? this.combineDateTime(session.sessionDate, session.endTime) : null,
      _count: {
        registrations: event._count?.bookings || 0,
        attendances: event._count?.attendances || 0,
      },
    };
  }

  private combineDateTime(date: Date, time: string) {
    const [hours, minutes] = (time || '00:00').split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours || 0, minutes || 0, 0, 0);
    return combined;
  }

  private overlaps(startTime: string, endTime: string, targetStart: Date, targetEnd: Date) {
    const sessionStartMinutes = this.toMinutes(startTime);
    const sessionEndMinutes = this.toMinutes(endTime);
    const targetStartMinutes = targetStart.getHours() * 60 + targetStart.getMinutes();
    const targetEndMinutes = targetEnd.getHours() * 60 + targetEnd.getMinutes();
    return sessionStartMinutes <= targetEndMinutes && sessionEndMinutes >= targetStartMinutes;
  }

  private toMinutes(time: string) {
    const [hours, minutes] = (time || '00:00').split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  private startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }
}

