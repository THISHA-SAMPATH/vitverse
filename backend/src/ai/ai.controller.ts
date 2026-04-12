import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized event recommendations' })
  getRecommendations(@CurrentUser('id') userId: string, @Query('limit') limit?: number) {
    return this.aiService.getEventRecommendations(userId, limit);
  }

  @Post('ocr')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Extract event info from poster image (base64)' })
  extractPoster(@Body() body: { image?: string; imageBase64?: string }) {
    const imageBase64 = body.imageBase64 || body.image;
    return this.aiService.extractPosterInfo(imageBase64);
  }

  @Post('extract-poster')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Extract event info from poster image (frontend alias)' })
  extractPosterAlias(@Body() body: { image?: string; imageBase64?: string }) {
    const imageBase64 = body.imageBase64 || body.image;
    return this.aiService.extractPosterInfo(imageBase64);
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chat with VITBot campus assistant' })
  chat(
    @Body('query') query: string,
    @Body('message') message: string,
    @Body('campus') campus: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiService.chat(query || message, userId, campus).then((response) => ({ response }));
  }

  @Get('search')
  @ApiOperation({ summary: 'Semantic search for events and clubs (query params)' })
  semanticSearchGet(@Query('q') query: string, @Query('campus') campus?: string) {
    return this.aiService.semanticSearch(query, campus);
  }

  @Post('search')
  @ApiOperation({ summary: 'Semantic search for events and clubs' })
  semanticSearch(@Body('query') query: string, @Body('q') q: string, @Query('campus') campus?: string) {
    const searchQuery = query || q;
    return this.aiService.semanticSearch(searchQuery, campus);
  }

  @Post('detect-conflicts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check for scheduling conflicts before creating event (frontend alias)' })
  checkConflictsAlias(@Body() eventData: any) {
    return this.aiService.detectConflicts(eventData);
  }

  @Post('conflict-check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check for scheduling conflicts before creating event' })
  checkConflicts(@Body() eventData: any) {
    return this.aiService.detectConflicts(eventData);
  }
}
