import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { FocService, CreateFocActivityDto } from './foc.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PdfService } from '../common/services/pdf.service';

@ApiTags('foc')
@Controller('foc')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FocController {
  constructor(
    private readonly focService: FocService,
    private readonly pdfService: PdfService,
  ) {}

  @Get('my-activities')
  getMyActivities(@CurrentUser('id') userId: string, @Query('semester') semester?: string) {
    return this.focService.getMyActivities(userId, semester);
  }

  @Get('progress')
  getProgress(@CurrentUser('id') userId: string) {
    return this.focService.getSemesterProgress(userId);
  }

  @Post('submit')
  submitActivity(@CurrentUser('id') userId: string, @Body() dto: CreateFocActivityDto) {
    return this.focService.submitActivity(userId, dto);
  }

  @Get('report/:semester')
  generateReport(@CurrentUser('id') userId: string, @Param('semester') semester: string) {
    return this.focService.generateFocReport(userId, semester);
  }

  @Get('report/:semester/pdf')
  @ApiOperation({ summary: 'Download FFCS/FOC activity report as PDF' })
  async generateReportPdf(
    @CurrentUser('id') userId: string,
    @Param('semester') semester: string,
    @Res() res: Response,
  ) {
    const data = await this.focService.generateFocReport(userId, semester);
    const pdfBuffer = await this.pdfService.generateFocReportPdf(data);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="FOC_Report_${semester.replace(/\s+/g, '_')}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get('pending-approvals')
  @UseGuards(RolesGuard)
  @Roles(Role.FACULTY, Role.SUPER_ADMIN)
  getPending(@CurrentUser('id') facultyId: string) {
    return this.focService.getPendingApprovals(facultyId);
  }

  @Get('club-activities')
  @UseGuards(RolesGuard)
  @Roles(Role.CLUB_PRESIDENT)
  getClubActivities(@CurrentUser('id') presidentId: string) {
    return this.focService.getClubActivitiesForPresident(presidentId);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.FACULTY, Role.SUPER_ADMIN)
  approve(@Param('id') id: string, @CurrentUser('id') facultyId: string, @Body('note') note?: string) {
    return this.focService.approveActivity(id, facultyId, note);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.FACULTY, Role.SUPER_ADMIN)
  reject(@Param('id') id: string, @CurrentUser('id') facultyId: string, @Body('note') note: string) {
    return this.focService.rejectActivity(id, facultyId, note);
  }

  @Post('bulk-approve')
  @UseGuards(RolesGuard)
  @Roles(Role.FACULTY, Role.SUPER_ADMIN)
  bulkApprove(@CurrentUser('id') facultyId: string, @Body() body: { ids: string[]; note?: string }) {
    return this.focService.bulkApproveActivities(body.ids || [], facultyId, body.note);
  }

  @Post('bulk-reject')
  @UseGuards(RolesGuard)
  @Roles(Role.FACULTY, Role.SUPER_ADMIN)
  bulkReject(@CurrentUser('id') facultyId: string, @Body() body: { ids: string[]; note: string }) {
    return this.focService.bulkRejectActivities(body.ids || [], facultyId, body.note);
  }
}
