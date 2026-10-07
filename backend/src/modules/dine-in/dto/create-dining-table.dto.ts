import {
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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { trimString } from '../../../common/utils/trim.util';

export class CreateDiningTableDto {
  @ApiProperty({
    example: 'b3f1c2a0-...',
    description: 'Which outlet (KitchenZone) this table belongs to',
  })
  @IsUUID()
  kitchenZoneId: string;

  @ApiProperty({ example: 'Table 4' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'Give the table a name.' })
  @MaxLength(40)
  label: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  capacity?: number;
}
