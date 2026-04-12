import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SeatsService } from './seats.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class HoldSeatDto {
  seatId: string;
  sessionId?: string;
}

class ConfirmBookingDto {
  seatId: string;
}

class JoinWaitlistDto {
  sessionId?: string;
}

class ReleaseSeatDto {
  seatId: string;
}

@ApiTags('seats')
@Controller('events/:eventId/seats')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Get()
  @ApiOperation({ summary: 'Get live seat map for event (optional ?sessionId=)' })
  getSeatMap(
    @Param('eventId') eventId: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.seatsService.getSeatMap(eventId, sessionId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get all sessions for event with speaker/stream info' })
  getEventSessions(@Param('eventId') eventId: string) {
    return this.seatsService.getEventSessions(eventId);
  }

  @Post('hold')
  @ApiOperation({ summary: 'Hold a seat (5-min TTL)' })
  holdSeat(
    @Param('eventId') eventId: string,
    @Body() dto: HoldSeatDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.seatsService.holdSeat(eventId, dto.seatId, userId, dto.sessionId);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm booking after hold' })
  confirmBooking(
    @Param('eventId') eventId: string,
    @Body() dto: ConfirmBookingDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.seatsService.confirmBooking(eventId, dto.seatId, userId);
  }

  @Post('waitlist')
  @ApiOperation({ summary: 'Join event waitlist' })
  joinWaitlist(
    @Param('eventId') eventId: string,
    @Body() dto: JoinWaitlistDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.seatsService.joinWaitlist(eventId, userId, dto.sessionId);
  }

  @Post('release')
  @ApiOperation({ summary: 'Release a held seat' })
  releaseSeat(
    @Param('eventId') eventId: string,
    @Body() dto: ReleaseSeatDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.seatsService.releaseSeat(dto.seatId, userId, eventId);
  }
}
