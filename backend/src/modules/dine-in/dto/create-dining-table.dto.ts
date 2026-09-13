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

export class CreateDiningTableDto {
  @ApiProperty({
    example: 'b3f1c2a0-...',
    description: 'Which outlet (KitchenZone) this table belongs to',
  })
  @IsUUID()
  kitchenZoneId: string;

  @ApiProperty({ example: 'Table 4' })
  @IsString()
  @MaxLength(40)
  label: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  capacity?: number;
}
