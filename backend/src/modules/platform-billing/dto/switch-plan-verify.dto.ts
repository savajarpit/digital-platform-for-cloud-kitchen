import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwitchPlanVerifyDto {
  @ApiProperty({
    description:
      'The PlatformPlan being switched to — re-fetched server-side, never trusted from client-supplied price/name fields.',
  })
  @IsUUID()
  planId: string;

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
