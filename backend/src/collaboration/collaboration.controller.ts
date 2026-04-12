import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { CollaborationService } from './collaboration.service';

@ApiTags('collaboration')
@Controller('collaboration')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLUB_PRESIDENT, Role.STUDENT)
@ApiBearerAuth()
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Get('tasks')
  getTasks(@CurrentUser() user: any, @Query('clubId') clubId?: string) {
    return this.collaborationService.getTasksForUser(user.id, user.role, clubId);
  }

  @Post('tasks')
  @Roles(Role.CLUB_PRESIDENT)
  createTask(@CurrentUser('id') presidentId: string, @Body() body: any) {
    return this.collaborationService.createTask(presidentId, body.clubId, body);
  }

  @Patch('tasks/:taskId/status')
  updateTaskStatus(
    @CurrentUser() user: any,
    @Param('taskId') taskId: string,
    @Body('status') status: any,
    @Body('clubId') clubId?: string,
    @Body('completionNote') completionNote?: string,
  ) {
    return this.collaborationService.updateTaskStatus(user.id, user.role, taskId, status, clubId, completionNote);
  }

  @Get('channels')
  getChannels(@CurrentUser('id') presidentId: string, @Query('clubId') clubId?: string) {
    return this.collaborationService.getChannelsForPresident(presidentId, clubId);
  }

  @Get('channels/:channelId/messages')
  getMessages(@CurrentUser('id') presidentId: string, @Param('channelId') channelId: string, @Query('clubId') clubId?: string) {
    return this.collaborationService.getMessagesForPresident(presidentId, channelId, clubId);
  }

  @Post('channels/:channelId/messages')
  postMessage(@CurrentUser('id') presidentId: string, @Param('channelId') channelId: string, @Body('text') text: string, @Body('clubId') clubId?: string) {
    return this.collaborationService.postMessage(presidentId, channelId, text, clubId);
  }

  @Get('meetings')
  getMeetings(@CurrentUser('id') presidentId: string, @Query('clubId') clubId?: string) {
    return this.collaborationService.getMeetingsForPresident(presidentId, clubId);
  }

  @Post('meetings')
  @Roles(Role.CLUB_PRESIDENT)
  createMeeting(@CurrentUser('id') presidentId: string, @Body() body: any) {
    return this.collaborationService.createMeeting(presidentId, body.clubId, body);
  }
}
