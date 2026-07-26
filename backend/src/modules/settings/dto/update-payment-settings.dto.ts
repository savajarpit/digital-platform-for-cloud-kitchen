import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePaymentSettingsDto {
  @ApiPropertyOptional({ example: 'rzp_test_xxxxx' })
  @IsOptional()
  @IsString()
  razorpayKeyId?: string;

  @ApiPropertyOptional({
    description:
      'Plaintext in, encrypted before storage. Omit to leave unchanged.',
  })
  @IsOptional()
  @IsString()
  razorpayKeySecret?: string;

  @ApiPropertyOptional({
    description:
      'Plaintext in, encrypted before storage. Omit to leave unchanged.',
  })
  @IsOptional()
  @IsString()
  razorpayWebhookSecret?: string;
}
