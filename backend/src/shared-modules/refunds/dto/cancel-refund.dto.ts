import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RefundMethod } from '../../../generated/prisma';

/**
 * Shared by the order and subscription cancel-refund endpoints — same
 * shape either way: an admin cancels and either records a manual refund
 * (paid outside this app) or triggers a real Razorpay refund (only when
 * the tenant has the `razorpay-refunds` Feature). `razorpayRefundId` is
 * never client-supplied — it comes back from the Razorpay API call itself.
 */
export class CancelRefundDto {
  @ApiProperty({ enum: RefundMethod })
  @IsEnum(RefundMethod)
  method: RefundMethod;

  @ApiProperty({
    description:
      'Amount to refund, in paise. Admin-entered/adjusted — never recomputed silently.',
    example: 25000,
  })
  @IsInt()
  @Min(0)
  amountInPaise: number;

  @ApiPropertyOptional({
    description:
      'Convenience/processing fee deducted from the refund, in paise.',
    example: 2500,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  convenienceFeeInPaise?: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
