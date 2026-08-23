import {
  IsBoolean,
  IsEmail,
  IsHexColor,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ThemeConfigInputDto {
  @ApiPropertyOptional({ example: '#16A34A' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#0EA5E9' })
  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @ApiPropertyOptional({ example: '#F59E0B' })
  @IsOptional()
  @IsHexColor()
  accentColor?: string;
}

export class UpdateBusinessProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  faviconUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  heroImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  supportPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsappBusinessNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  pincode?: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  timezone?: string;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  gstNumber?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  defaultLocale?: string;

  @ApiPropertyOptional({ type: ThemeConfigInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ThemeConfigInputDto)
  themeConfig?: ThemeConfigInputDto;

  @ApiPropertyOptional({
    example: false,
    description:
      'Show the testimonials block on the home page (only if published reviews also exist)',
  })
  @IsOptional()
  @IsBoolean()
  showReviewsOnHomepage?: boolean;

  @ApiPropertyOptional({
    description:
      "Google Search Console's HTML-tag verification content — the `content` attribute value from the <meta name=\"google-site-verification\"> tag Search Console gives you, not the whole tag.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  searchConsoleVerification?: string;

  @ApiPropertyOptional({ description: 'FSSAI food business license number' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  fssaiLicenseNumber?: string;

  @ApiPropertyOptional({
    example: false,
    description:
      'Show the FSSAI badge/license number in the storefront footer and on invoices — only takes effect once fssaiLicenseNumber is also set',
  })
  @IsOptional()
  @IsBoolean()
  showFssaiLicense?: boolean;
}
