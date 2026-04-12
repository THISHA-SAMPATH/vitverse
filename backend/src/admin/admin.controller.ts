import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Campus, Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.FACULTY)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @Roles(Role.SUPER_ADMIN)
  getDashboard() {
    return this.adminService.getSuperAdminDashboard();
  }

  @Get('overview')
  getOverview() {
    return this.adminService.getSuperAdminDashboard();
  }

  @Get('campus/:campus/analytics')
  getCampusAnalytics(@Param('campus') campus: Campus) {
    return this.adminService.getCampusAnalytics(campus);
  }

  @Get('campus-analytics')
  getCampusAnalyticsForFrontend(@CurrentUser('campus') campus?: Campus) {
    return this.adminService.getCampusAnalytics(campus || Campus.VELLORE);
  }

  @Get('users')
  @Roles(Role.SUPER_ADMIN)
  getUsers(@Query() filters: any) {
    return this.adminService.getAllUsers(filters);
  }

  @Patch('users/:id/toggle-status')
  @Roles(Role.SUPER_ADMIN)
  toggleUser(@Param('id') id: string) {
    return this.adminService.toggleUserStatus(id);
  }

  @Patch('users/:id/toggle')
  @Roles(Role.SUPER_ADMIN)
  toggleUserForFrontend(@Param('id') id: string) {
    return this.adminService.toggleUserStatus(id);
  }

  @Patch('users/:id/role')
  @Roles(Role.SUPER_ADMIN)
  updateRole(@Param('id') id: string, @Body('role') role: string) {
    return this.adminService.updateUserRole(id, role);
  }

  @Get('reports/seat-utilization')
  getSeatUtilization() {
    return this.adminService.getSeatUtilizationReport();
  }

  @Get('seat-utilization')
  getSeatUtilizationForFrontend() {
    return this.adminService.getSeatUtilizationReport();
  }

  @Get('reports/club-performance')
  getClubPerformance() {
    return this.adminService.getClubPerformanceReport();
  }

  @Get('reports/:reportId')
  downloadReport(@Param('reportId') reportId: string, @Query() filters: any) {
    return this.adminService.downloadReport(reportId, filters);
  }

  @Get('fraud-detection')
  getFraudDetection() {
    return this.adminService.getFraudDetection();
  }

  @Get('announcements')
  getAnnouncements(@Query('campus') campus?: Campus) {
    return this.adminService.getAnnouncements(campus);
  }

  @Post('announcements')
  createAnnouncement(@Body() data: any, @CurrentUser('id') authorId: string) {
    return this.adminService.createAnnouncement({ ...data, authorId });
  }
}
