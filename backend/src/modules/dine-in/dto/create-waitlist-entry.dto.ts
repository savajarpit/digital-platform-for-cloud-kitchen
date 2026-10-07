import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { trimToUndefined } from '../../../common/utils/trim.util';
import {
  INDIA_PHONE_MESSAGE,
  INDIA_PHONE_REGEX,
} from '../../../common/constants/phone.constant';

/**
 * Deliberately minimal — a waiting party is just "how many, and who to call
 * when a table's ready," never an order. Both guest fields are optional: a
 * lot of walk-ins won't want to give a phone number just to wait in line.
 */
export class CreateWaitlistEntryDto {
  @ApiProperty({
    example: 'b3f1c2a0-...',
    description: 'Which outlet (KitchenZone) they are waiting at',
  })
  @IsUUID()
  kitchenZoneId: string;

  @ApiPropertyOptional({ example: 'Sharma' })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  guestName?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @Matches(INDIA_PHONE_REGEX, { message: INDIA_PHONE_MESSAGE })
  guestPhone?: string;

  @ApiPropertyOptional({ example: 4, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  partySize?: number;
}
