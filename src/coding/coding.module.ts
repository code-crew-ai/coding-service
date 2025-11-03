import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { GitModule } from "../git/git.module";
import { ExternalApiModule } from "../external-api/external-api.module";
import { CodingController } from "./coding.controller";
import { CodingService } from "./coding.service";
import { ExecutorService } from "./executor.service";

@Module({
  imports: [AuthModule, GitModule, ExternalApiModule],
  controllers: [CodingController],
  providers: [CodingService, ExecutorService],
  exports: [CodingService],
})
export class CodingModule {}
