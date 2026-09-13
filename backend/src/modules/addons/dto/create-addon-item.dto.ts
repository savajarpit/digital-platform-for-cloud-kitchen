import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddonItemDto {
  @ApiProperty({ example: 'b3f1c2a0-...' })
  @IsUUID()
  addonGroupId: string;

  @ApiProperty({ example: 'Extra Roti' })
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 2000, description: 'Price per unit, in paise' })
  @IsInt()
  @Min(0)
  priceInPaise: number;

  @ApiPropertyOptional({
    example: 4,
    default: 1,
    description:
      'Caps the +/- stepper once this item is picked — 1 renders a single tap-to-select toggle instead',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxQuantityPerOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
