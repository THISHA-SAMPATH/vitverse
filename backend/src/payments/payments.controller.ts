import {
  Controller, Get, Post, Delete, Body, Param, UseGuards,
  HttpCode, HttpStatus, Req, RawBodyRequest
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('bookings')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('payments/config')
  @ApiOperation({ summary: 'Get Razorpay key ID for frontend' })
  getConfig() {
    return this.paymentsService.getRazorpayConfig();
  }

  @Post('bookings/free')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Book a free event session' })
  bookFree(
    @Body() body: { sessionId: string; seatId?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.bookFreeEvent(userId, body.sessionId, body.seatId);
  }

  @Post('bookings/create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Razorpay order for paid event' })
  createOrder(
    @Body() body: { sessionId: string; seatId?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.createOrder(userId, body.sessionId, body.seatId);
  }

  @Post('bookings/verify-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Razorpay payment and confirm booking' })
  verifyPayment(
    @Body() body: {
      bookingId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.verifyPayment(
      userId,
      body.bookingId,
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature,
    );
  }

  @Post('bookings/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel booking + auto refund' })
  cancelBooking(
    @Param('id') bookingId: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.cancelBooking(bookingId, userId, reason);
  }

  @Post('checkin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check in attendee via QR token' })
  checkIn(
    @Body('qrToken') qrToken: string,
    @CurrentUser('id') organizerId: string,
  ) {
    return this.paymentsService.checkIn(qrToken, organizerId);
  }

  @Get('bookings/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my bookings' })
  getMyBookings(@CurrentUser('id') userId: string) {
    return this.paymentsService.getUserBookings(userId);
  }

  @Get('bookings/event/:eventId/registrations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get registrations for a president-owned or admin-visible event' })
  getEventRegistrations(
    @Param('eventId') eventId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.paymentsService.getEventRegistrations(eventId, userId, role as any);
  }

  @Get('bookings/event/:eventId/export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export registrations for a president-owned or admin-visible event' })
  exportEventRegistrations(
    @Param('eventId') eventId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.paymentsService.exportEventRegistrations(eventId, userId, role as any);
  }

  @Post('payments/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook endpoint' })
  webhook(@Req() req: RawBodyRequest<any>) {
    const signature = req.headers['x-razorpay-signature'] as string;
    return this.paymentsService.handleWebhook(req.body, signature, req.rawBody);
  }
}
