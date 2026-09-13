import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddonGroupDto {
  @ApiProperty({ example: 'Roti Extras' })
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({
    example: 0,
    default: 0,
    description:
      '0 = entirely optional; 1+ makes at least one selection required',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSelections?: number;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description:
      'How many distinct items from this group a customer can pick — 1 behaves like a radio button, higher like checkboxes up to that count',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxSelections?: number;
}
