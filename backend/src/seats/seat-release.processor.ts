import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { SeatsService } from './seats.service';

@Processor('seat-release')
export class SeatReleaseProcessor {
  private readonly logger = new Logger(SeatReleaseProcessor.name);

  constructor(private seatsService: SeatsService) {}

  @Process('release-seat')
  async handleRelease(job: Job<{ seatId: string; userId: string; eventId: string }>) {
    const { seatId, userId, eventId } = job.data;
    this.logger.log(`Processing seat release: ${seatId} for user ${userId}`);
    try {
      await this.seatsService.releaseSeat(seatId, userId, eventId);
    } catch (err) {
      this.logger.error(`Failed to release seat ${seatId}: ${err.message}`);
      throw err;
    }
  }
}
