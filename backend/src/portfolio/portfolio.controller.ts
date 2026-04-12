import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PortfolioService } from './portfolio.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

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
