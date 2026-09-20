import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  HERO_FEATURE_ICON_KEYS,
  HERO_FEATURE_LABEL_MAX,
  HERO_FEATURES_MAX,
  type HeroFeatureIconKey,
} from '../../../common/constants/hero-feature-icons.constant';

export class HeroFeatureDto {
  @ApiProperty({ enum: HERO_FEATURE_ICON_KEYS, example: 'truck' })
  @IsIn(HERO_FEATURE_ICON_KEYS)
  icon: HeroFeatureIconKey;

  @ApiProperty({ example: 'Free delivery', maxLength: HERO_FEATURE_LABEL_MAX })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(HERO_FEATURE_LABEL_MAX)
  label: string;
}

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

  @ApiPropertyOptional({
    type: [HeroFeatureDto],
    description:
      'Up to 4 highlights shown under the hero buttons; empty array hides the row',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(HERO_FEATURES_MAX)
  @ValidateNested({ each: true })
  @Type(() => HeroFeatureDto)
  heroFeatures?: HeroFeatureDto[];

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
