import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configuredFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const allowedOrigins = Array.from(new Set([
    configuredFrontendUrl,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ]));

  // Security
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // WebSocket
  app.useWebSocketAdapter(new IoAdapter(app));

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('VITVerse API')
    .setDescription('Multi-campus VIT Events & Clubs Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('events', 'Event management')
    .addTag('clubs', 'Club management')
    .addTag('seats', 'Seat booking with concurrency')
    .addTag('leaderboard', 'Points & rankings')
    .addTag('foc', 'FOC/FSES credit management')
    .addTag('ai', 'AI-powered features')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 VITVerse backend running on: http://localhost:${port}`);
  console.log(`📚 API docs: http://localhost:${port}/api/docs`);
}
bootstrap();
