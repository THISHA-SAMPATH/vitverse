import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { ClubsModule } from './clubs/clubs.module';
import { SeatsModule } from './seats/seats.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { FocModule } from './foc/foc.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';
import { AchievementModule } from './achievements/achievement.module';
import { PaymentsModule } from './payments/payments.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { TeamsModule } from './teams/teams.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 200 },
    ]),
    PrismaModule,
    EmailModule,
    AchievementModule,
    AuthModule,
    UsersModule,
    EventsModule,
    ClubsModule,
    SeatsModule,
    LeaderboardModule,
    FocModule,
    PortfolioModule,
    AdminModule,
    AiModule,
    PaymentsModule,
    CollaborationModule,
    TeamsModule,
  ],
})
export class AppModule {}
