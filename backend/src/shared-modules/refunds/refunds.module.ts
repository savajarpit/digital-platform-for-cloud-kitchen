import { Module } from '@nestjs/common';
import { RefundsRepository } from './refunds.repository';

@Module({
  providers: [RefundsRepository],
  exports: [RefundsRepository],
})
export class RefundsModule {}
