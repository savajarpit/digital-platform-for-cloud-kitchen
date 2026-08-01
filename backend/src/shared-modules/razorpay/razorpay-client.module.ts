import { Module } from '@nestjs/common';
import { RazorpayClientService } from './razorpay-client.service';
import { PlatformRazorpayClientService } from './platform-razorpay-client.service';
import { SettingsModule } from '../../modules/settings/settings.module';

@Module({
  imports: [SettingsModule],
  providers: [RazorpayClientService, PlatformRazorpayClientService],
  exports: [RazorpayClientService, PlatformRazorpayClientService],
})
export class RazorpayClientModule {}
