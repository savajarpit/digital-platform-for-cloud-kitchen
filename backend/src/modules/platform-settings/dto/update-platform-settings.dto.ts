import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlatformSettingsDto {
  @ApiPropertyOptional({
    description:
      'Platform-wide kill-switch for WhatsApp OTP delivery — off by default, OTP goes out over email only until enabled here. Does not affect order-confirmation/subscription-disruption WhatsApp sends, which stay gated per-tenant.',
  })
  @IsOptional()
  @IsBoolean()
  whatsappOtpEnabled?: boolean;
}
