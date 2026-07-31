import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStaticPageDto {
  @ApiProperty({ example: 'privacy-policy' })
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase, kebab-case (e.g. "privacy-policy")',
  })
  slug: string;

  @ApiProperty({ example: 'Privacy Policy' })
  @IsString()
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: '## Privacy Policy\n\nWe respect your privacy...' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
