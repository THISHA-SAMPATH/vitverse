import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('teams')
@Controller('teams')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get('my-teams')
  myTeams(@CurrentUser('id') userId: string) {
    return this.teamsService.myTeams(userId);
  }

  @Post()
  createTeam(
    @Body() dto: { name: string; eventId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.teamsService.createTeam(dto, userId);
  }

  @Post('join')
  joinTeam(
    @Body() dto: { inviteCode: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.teamsService.joinTeam(dto.inviteCode, userId);
  }

  @Get(':id')
  getTeam(@Param('id') id: string) {
    return this.teamsService.getTeam(id);
  }
}
