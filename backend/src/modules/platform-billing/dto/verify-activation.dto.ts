import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyActivationDto {
  @ApiProperty()
  @IsString()
  razorpayPaymentId: string;

  @ApiProperty()
  @IsString()
  razorpaySubscriptionId: string;

  @ApiProperty()
  @IsString()
  razorpaySignature: string;
}
