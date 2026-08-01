import { IsEnum, IsInt, IsString, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BillingCycle } from '../../../generated/prisma';

export class CreateSubscriptionInviteDto {
  @ApiProperty({ example: 'STANDARD' })
  @IsString()
  @MaxLength(40)
  planCode: string;

  @ApiProperty({ enum: BillingCycle, example: BillingCycle.MONTHLY })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiProperty({
    example: 99900,
    description: 'Amount in paise, per billing cycle',
  })
  @IsInt()
  @Min(100)
  amountInPaise: number;
}
