import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { GitModule } from './git/git.module';
import { ExternalApiModule } from './external-api/external-api.module';
import { CodingModule } from './coding/coding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    HealthModule,
    AuthModule,
    GitModule,
    ExternalApiModule,
    CodingModule,
  ],
})
export class AppModule {}
