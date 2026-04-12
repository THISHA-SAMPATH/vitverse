import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Campus } from '@prisma/client';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('students')
  @ApiOperation({ summary: 'Student leaderboard with podium' })
  getStudents(@Query('campus') campus?: Campus) {
    return this.leaderboardService.getStudentLeaderboard(campus);
  }

  @Get('clubs')
  @ApiOperation({ summary: 'Club leaderboard' })
  getClubs(@Query('campus') campus?: Campus) {
    return this.leaderboardService.getClubLeaderboard(campus);
  }

  @Get('campuses')
  @ApiOperation({ summary: 'Cross-campus competition' })
  getCampuses() {
    return this.leaderboardService.getCampusLeaderboard();
  }

  @Get('my-rank')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getMyRank(@CurrentUser('id') userId: string) {
    return this.leaderboardService.getUserRank(userId);
  }

  @Get('points-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getHistory(@CurrentUser('id') userId: string) {
    return this.leaderboardService.getPointHistory(userId);
  }
}
