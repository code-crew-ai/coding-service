import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import {
  LoggingModule,
  HealthModule,
  InternalJwtService,
  INTERNAL_JWT_CONFIG,
} from "@code-crew-ai/server";
import { configuration } from "./config/configuration";
import { validationSchema } from "./config/validation.schema";
import { AuthModule } from "./auth/auth.module";
import { GitModule } from "./git/git.module";
import { ExternalApiModule } from "./external-api/external-api.module";
import { CodingModule } from "./coding/coding.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    LoggingModule,
    HealthModule,
    AuthModule,
    GitModule,
    ExternalApiModule,
    CodingModule,
  ],
  providers: [
    // Configure internal JWT for service-to-service authentication
    {
      provide: INTERNAL_JWT_CONFIG,
      useValue: {
        secret: process.env.COMMON_INTERNAL_JWT_SECRET,
        expiresIn: "1h",
      },
    },
    InternalJwtService,
  ],
  exports: [InternalJwtService],
})
export class AppModule {}
