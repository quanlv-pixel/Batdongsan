import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { initEnvironment } from './config/env.config.js';

async function bootstrap() {
  initEnvironment();
  const app = await NestFactory.create(AppModule);

  // Global API prefix
  app.setGlobalPrefix('api');

  // Global validation pipe with strict whitelisting to strip unauthorized fields
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS — restrict origins in production via environment variable
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Backend listening on http://localhost:${port}`);
}
await bootstrap();