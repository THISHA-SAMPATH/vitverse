import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Campus, EventStatus, Role } from '@prisma/client';
import { EventsService, CreateEventDto } from './events.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List all events with filters' })
  @ApiQuery({ name: 'campus', enum: Campus, required: false })
  @ApiQuery({ name: 'status', enum: EventStatus, required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query() query: any) {
    return this.eventsService.findAll(query);
  }

  @Get('live')
  @ApiOperation({ summary: 'Get currently live events' })
  getLive() {
    return this.eventsService.getLiveEvents();
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending events' })
  getTrending() {
    return this.eventsService.getTrending();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard stats' })
  getStats() {
    return this.eventsService.getDashboardStats();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get event by slug' })
  findOne(@Param('slug') slug: string) {
    return this.eventsService.findOne(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLUB_PRESIDENT, Role.FACULTY, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event' })
  create(@Body() dto: CreateEventDto, @CurrentUser('id') userId: string) {
    return this.eventsService.create(dto, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update event' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateEventDto>,
    @CurrentUser() user: any,
  ) {
    return this.eventsService.update(id, dto, user.id, user.role);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a draft event' })
  publish(@Param('id') id: string, @CurrentUser() user: any) {
    return this.eventsService.publish(id, user.id, user.role);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FACULTY, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a draft event' })
  reject(@Param('id') id: string, @CurrentUser() user: any, @Body('note') note?: string) {
    return this.eventsService.reject(id, user.id, user.role, note);
  }

  @Post(':eventId/attendance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark attendance via QR scan' })
  markAttendance(
    @Param('eventId') eventId: string,
    @Body('qrCode') qrCode: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.eventsService.markAttendance(eventId, qrCode, userId);
  }

  @Post(':id/feedback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  submitFeedback(
    @Param('id') id: string,
    @Body() dto: { rating: number; comment?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.eventsService.submitFeedback(id, userId, dto);
  }

  @Get(':id/media')
  getMedia(@Param('id') id: string) {
    return this.eventsService.getMedia(id);
  }

  @Post(':id/media')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLUB_PRESIDENT, Role.FACULTY, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  addMedia(
    @Param('id') id: string,
    @Body() dto: { url: string; type: string; caption?: string },
  ) {
    return this.eventsService.addMedia(id, dto);
  }

  @Delete(':id/media/:mediaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLUB_PRESIDENT, Role.FACULTY, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  deleteMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.eventsService.deleteMedia(id, mediaId);
  }
}
