import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateHomePageContentDto {
  @ApiPropertyOptional({ example: 'Fresh & healthy' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  heroTagline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  heroTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  heroSubtitle?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Up to 4 hero collage images',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsUrl({}, { each: true })
  heroImageUrls?: string[];

  @ApiPropertyOptional({ example: 'What our customers say' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reviewsSectionTitle?: string;

  @ApiPropertyOptional({ example: "Don't just take our word for it" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reviewsSectionDescription?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  ctaEnabled?: boolean;

  @ApiPropertyOptional({ example: 'Start eating better today' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ctaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  ctaDescription?: string;

  @ApiPropertyOptional({ example: 'Choose Your Plan' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  ctaPrimaryLabel?: string;

  @ApiPropertyOptional({ example: '/plans' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  ctaPrimaryLink?: string;

  @ApiPropertyOptional({ example: 'Order a Single Meal' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  ctaSecondaryLabel?: string;

  @ApiPropertyOptional({ example: '/menu' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  ctaSecondaryLink?: string;
}
