import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AchievementService } from './achievement.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('achievements')
@Controller('achievements')
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my achievements and progress' })
  getMyAchievements(@CurrentUser('id') userId: string) {
    return this.achievementService.getUserAchievements(userId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Top users by points' })
  getLeaderboard() {
    return this.achievementService.getLeaderboard();
  }
}
