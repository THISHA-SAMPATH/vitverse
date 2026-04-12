import { Controller, Get, Patch, Param, Body, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/clubs')
  getMyClubs(@CurrentUser('id') id: string) {
    return this.usersService.getMyClubs(id);
  }

  @Get('me')
  getMe(@CurrentUser('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch('me')
  updateMe(@CurrentUser('id') id: string, @Body() body: any) {
    return this.usersService.updateProfile(id, body);
  }

  @Patch('me/password')
  updatePassword(@CurrentUser('id') id: string, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.usersService.changePassword(id, body.currentPassword, body.newPassword);
  }

  @Get('notifications')
  getNotifications(@CurrentUser('id') userId: string) {
    return this.usersService.getNotifications(userId);
  }

  @Patch('notifications/read-all')
  markRead(@CurrentUser('id') userId: string) {
    return this.usersService.markNotificationsRead(userId);
  }

  @Get('sessions')
  getSessions(@CurrentUser('id') userId: string) {
    return this.usersService.getSessions(userId);
  }

  @Delete('sessions/:id')
  revokeSession(@Param('id') sessionId: string, @CurrentUser('id') userId: string) {
    return this.usersService.revokeSession(sessionId, userId);
  }
}
