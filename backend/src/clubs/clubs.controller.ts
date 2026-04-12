import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ClubsService, CreateClubDto } from './clubs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('clubs')
@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get()
  @ApiOperation({ summary: 'List clubs with optional filters' })
  findAll(@Query() query: any) {
    return this.clubsService.findAll(query);
  }

  @Get('categories')
  getCategories() {
    return this.clubsService.getCategories();
  }

  @Get('president/dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getPresidentDashboard(@CurrentUser('id') userId: string) {
    return this.clubsService.getPresidentDashboard(userId);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get club detail page' })
  findOne(@Param('slug') slug: string) {
    return this.clubsService.findOne(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.FACULTY)
  @ApiBearerAuth()
  create(@Body() dto: CreateClubDto, @CurrentUser('id') userId: string) {
    return this.clubsService.create(dto, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: Partial<CreateClubDto>, @CurrentUser() user: any) {
    return this.clubsService.update(id, dto, user.id, user.role);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  join(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.clubsService.joinClub(id, userId);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  leave(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.clubsService.leaveClub(id, userId);
  }

  @Post(':id/achievements')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  addAchievement(@Param('id') id: string, @Body() data: any, @CurrentUser('id') userId: string) {
    return this.clubsService.addAchievement(id, data, userId);
  }

  @Get(':id/health-score')
  getHealthScore(@Param('id') id: string) {
    return this.clubsService.computeHealthScore(id);
  }
}
