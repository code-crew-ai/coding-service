import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GitModule } from '../git/git.module';
import { ExternalApiModule } from '../external-api/external-api.module';
import { CodingController } from './coding.controller';
import { CodingHandler } from './coding.handler';

@Module({
  imports: [AuthModule, GitModule, ExternalApiModule],
  controllers: [CodingController],
  providers: [CodingHandler],
  exports: [CodingHandler],
})
export class CodingModule {}
