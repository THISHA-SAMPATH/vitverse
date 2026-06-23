import { Controller, Get, Put, Body, Param, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { PortfolioService } from './portfolio.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PdfService } from '../common/services/pdf.service';

@ApiTags('portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly pdfService: PdfService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my full portfolio' })
  getMyPortfolio(@CurrentUser('id') userId: string) {
    return this.portfolioService.getPortfolio(userId);
  }

  @Get('me/resume')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate resume data' })
  getResume(@CurrentUser('id') userId: string) {
    return this.portfolioService.generateResumeData(userId);
  }

  @Get('me/resume/pdf')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate and download resume as PDF' })
  async getResumePdf(@CurrentUser('id') userId: string, @Res() res: Response) {
    const data = await this.portfolioService.getPortfolio(userId);
    const pdfBuffer = await this.pdfService.generateResumePdf(data);
    const safeName = data.user.name.replace(/\s+/g, '_');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName}_VITVerse_Resume.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get(':userId/public')
  @ApiOperation({ summary: 'View public portfolio of any student' })
  getPublic(@Param('userId') userId: string) {
    return this.portfolioService.getPublicProfile(userId);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profile info' })
  updateProfile(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.portfolioService.updateProfile(userId, data);
  }

  @Put('skills')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update skill radar' })
  updateSkills(@CurrentUser('id') userId: string, @Body() skills: any) {
    return this.portfolioService.updateSkillRadar(userId, skills);
  }
}
