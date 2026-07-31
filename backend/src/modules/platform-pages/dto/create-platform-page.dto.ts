import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlatformPageDto {
  @ApiProperty({ example: 'about-us' })
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase, kebab-case (e.g. "about-us")',
  })
  slug: string;

  @ApiProperty({ example: 'About Us' })
  @IsString()
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: '## About Us\n\n...' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
