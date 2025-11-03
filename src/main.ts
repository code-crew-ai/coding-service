import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create HTTP application for health checks
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3010);
  const redisHost = configService.get<string>('CODING_REDIS_HOST', 'redis');
  const redisPort = configService.get<number>('CODING_REDIS_PORT', 6379);
  const redisUrl = configService.get<string>('CODING_REDIS_URL');

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Connect Redis microservice
  const redisOptions = redisUrl
    ? { url: redisUrl }
    : { host: redisHost, port: redisPort };

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: redisOptions,
  });

  await app.startAllMicroservices();
  logger.log('Redis microservice started');

  // Start HTTP server for health checks
  await app.listen(port);
  logger.log(`HTTP server listening on port ${port}`);
  logger.log(`Health endpoint: http://localhost:${port}/health`);
}

bootstrap();
