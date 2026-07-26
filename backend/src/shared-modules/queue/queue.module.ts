import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { MailModule } from '../mail/mail.module';
import { MailProcessor } from './processors/mail.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('redis.host'),
          port: config.get('redis.port'),
          password: config.get('redis.password'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: 'mail' }, { name: 'notifications' }),
    MailModule,
  ],
  providers: [MailProcessor],
  exports: [BullModule],
})
export class QueueModule {}
