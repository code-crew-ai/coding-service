import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GitModule } from '../git/git.module';
import { ExternalApiModule } from '../external-api/external-api.module';
import { ExecutorService } from './executor.service';

@Module({
  imports: [AuthModule, GitModule, ExternalApiModule],
  providers: [ExecutorService],
  exports: [ExecutorService],
})
export class CodingModule {}
