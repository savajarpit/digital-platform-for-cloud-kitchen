import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'Home' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;

  @ApiProperty({
    example: '+919876543210',
    description: 'Reachable delivery contact number, in E.164 format',
  })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'Phone must be in E.164 format, e.g. +919876543210',
  })
  contactPhone: string;

  @ApiProperty({ example: '221B Baker Street' })
  @IsString()
  @MaxLength(200)
  line1: string;

  @ApiPropertyOptional({ example: 'Near Central Park' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @MaxLength(80)
  city: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @MaxLength(80)
  state: string;

  @ApiProperty({ example: '400001' })
  @IsString()
  @Matches(/^\d{4,10}$/, { message: 'Pincode must be numeric' })
  pincode: string;

  @ApiPropertyOptional({ example: 'Opposite the bakery' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  landmark?: string;

  @ApiPropertyOptional({
    example: 23.0225,
    description: 'Captured from the map picker, if used',
  })
  @IsOptional()
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({
    example: 72.5714,
    description: 'Captured from the map picker, if used',
  })
  @IsOptional()
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
