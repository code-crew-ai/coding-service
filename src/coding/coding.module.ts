import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AuthModule } from '../auth/auth.module';
import { GitModule } from '../git/git.module';
import { ExternalApiModule } from '../external-api/external-api.module';
import { CodingController } from './coding.controller';
import { CodingService } from './coding.service';
import { ExecutorService } from './executor.service';

@Module({
  imports: [AuthModule, GitModule, ExternalApiModule],
  controllers: [CodingController],
  providers: [
    CodingService,
    ExecutorService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const redisHost = configService.get<string>('REDIS_HOST', 'redis');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);

        // Use URL if provided, otherwise use host:port
        if (redisUrl) {
          return new Redis(redisUrl);
        }
        return new Redis({
          host: redisHost,
          port: redisPort,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [CodingService],
})
export class CodingModule {}
