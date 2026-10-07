import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MAX_MEAL_PRICE_IN_PAISE } from '../../menu/dto/create-meal.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddonItemDto {
  @ApiProperty({ example: 'b3f1c2a0-...' })
  @IsUUID()
  addonGroupId: string;

  @ApiProperty({ example: 'Extra Roti' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Give the add-on a name.' })
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 2000, description: 'Price per unit, in paise' })
  @IsInt()
  @Min(0)
  @Max(MAX_MEAL_PRICE_IN_PAISE, {
    message: 'Price can be at most ₹1,00,000.',
  })
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
