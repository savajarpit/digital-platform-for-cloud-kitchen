import { Global, Module } from '@nestjs/common';
import { JobRunnerService } from './job-runner.service';

@Global()
@Module({
  providers: [JobRunnerService],
  exports: [JobRunnerService],
})
export class JobsModule {}
