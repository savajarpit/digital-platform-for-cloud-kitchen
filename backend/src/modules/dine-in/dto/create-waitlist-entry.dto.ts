import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @IsOptional()
  @IsString()
  @MaxLength(80)
  guestName?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  guestPhone?: string;

  @ApiPropertyOptional({ example: 4, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  partySize?: number;
}
