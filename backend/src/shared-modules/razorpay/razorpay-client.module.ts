import { Module } from '@nestjs/common';
import { RazorpayClientService } from './razorpay-client.service';
import { SettingsModule } from '../../modules/settings/settings.module';

@Module({
  imports: [SettingsModule],
  providers: [RazorpayClientService],
  exports: [RazorpayClientService],
})
export class RazorpayClientModule {}
