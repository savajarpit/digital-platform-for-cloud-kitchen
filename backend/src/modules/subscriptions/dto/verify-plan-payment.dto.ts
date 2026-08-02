import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPlanPaymentDto {
  @ApiProperty({ example: 'order_JHD834hjbxzhd38d' })
  @IsString()
  razorpayOrderId: string;

  @ApiProperty({ example: 'pay_JHD834hjbxzhd38d' })
  @IsString()
  razorpayPaymentId: string;

  @ApiProperty({ example: 'a1b2c3...' })
  @IsString()
  razorpaySignature: string;
}
