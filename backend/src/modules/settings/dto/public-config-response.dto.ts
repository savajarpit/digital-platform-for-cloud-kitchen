import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { BrandDisplayMode } from '../../../generated/prisma';

export class ThemeConfigDto {
  @ApiPropertyOptional({ example: '#16A34A' })
  @Expose()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#0EA5E9' })
  @Expose()
  secondaryColor?: string;

  @ApiPropertyOptional({ example: '#F59E0B' })
  @Expose()
  accentColor?: string;
}

export class PublicConfigResponseDto {
  @ApiProperty({ example: 'Nutriwell Kitchen' })
  @Expose()
  displayName: string;

  @ApiPropertyOptional()
  @Expose()
  description?: string;

  @ApiPropertyOptional()
  @Expose()
  logoUrl?: string;

  @ApiPropertyOptional()
  @Expose()
  faviconUrl?: string;

  @ApiPropertyOptional()
  @Expose()
  heroImageUrl?: string;

  @ApiProperty({ enum: BrandDisplayMode, example: BrandDisplayMode.BOTH })
  @Expose()
  headerDisplayMode: BrandDisplayMode;

  @ApiProperty({ enum: BrandDisplayMode, example: BrandDisplayMode.BOTH })
  @Expose()
  footerDisplayMode: BrandDisplayMode;

  @ApiProperty({ example: 36 })
  @Expose()
  headerLogoHeightPx: number;

  @ApiPropertyOptional({ description: 'Absent means auto (no width cap)' })
  @Expose()
  headerLogoWidthPx?: number;

  @ApiProperty({ example: 36 })
  @Expose()
  footerLogoHeightPx: number;

  @ApiPropertyOptional({ description: 'Absent means auto (no width cap)' })
  @Expose()
  footerLogoWidthPx?: number;

  @ApiPropertyOptional({ description: 'Dedicated social-share image, recommended 1200x630px' })
  @Expose()
  ogImageUrl?: string;

  @ApiPropertyOptional()
  @Expose()
  ogImageAlt?: string;

  @ApiPropertyOptional()
  @Expose()
  ogImageWidth?: number;

  @ApiPropertyOptional()
  @Expose()
  ogImageHeight?: number;

  @ApiProperty({ type: ThemeConfigDto })
  @Expose()
  @Type(() => ThemeConfigDto)
  themeConfig: ThemeConfigDto;

  @ApiProperty({ example: 'en' })
  @Expose()
  defaultLocale: string;

  @ApiProperty({ example: 'INR' })
  @Expose()
  currency: string;

  @ApiPropertyOptional()
  @Expose()
  supportEmail?: string;

  @ApiPropertyOptional()
  @Expose()
  supportPhone?: string;

  @ApiPropertyOptional()
  @Expose()
  addressLine1?: string;

  @ApiPropertyOptional()
  @Expose()
  addressLine2?: string;

  @ApiPropertyOptional()
  @Expose()
  city?: string;

  @ApiPropertyOptional()
  @Expose()
  state?: string;

  @ApiPropertyOptional()
  @Expose()
  country?: string;

  @ApiPropertyOptional()
  @Expose()
  pincode?: string;

  @ApiPropertyOptional()
  @Expose()
  whatsappBusinessNumber?: string;

  @ApiPropertyOptional({
    description: 'GST registration number, shown on invoices/footer if set',
  })
  @Expose()
  gstNumber?: string;

  @ApiPropertyOptional({
    description:
      'FSSAI license number — only present when the tenant has both set a number and enabled showFssaiLicense',
  })
  @Expose()
  fssaiLicenseNumber?: string;

  @ApiPropertyOptional({
    description: 'Kitchen latitude, for LocalBusiness structured data',
  })
  @Expose()
  kitchenLat?: number;

  @ApiPropertyOptional({
    description: 'Kitchen longitude, for LocalBusiness structured data',
  })
  @Expose()
  kitchenLng?: number;

  @ApiPropertyOptional({
    description:
      'Google Search Console verification content, rendered as a <meta name="google-site-verification"> tag when set',
  })
  @Expose()
  searchConsoleVerification?: string;

  @ApiProperty({
    example: 2,
    description: 'How many days ahead a customer may schedule delivery',
  })
  @Expose()
  maxAdvanceOrderDays: number;

  @ApiProperty({ example: false })
  @Expose()
  showReviewsOnHomepage: boolean;

  @ApiProperty({
    example: true,
    description:
      'SUPER_ADMIN-controlled — whether the "Powered by OkaySync" line shows in the footer. Never editable by the tenant.',
  })
  @Expose()
  poweredByBrandingEnabled: boolean;

  @ApiPropertyOptional({ example: 'Fresh & healthy' })
  @Expose()
  heroTagline?: string;

  @ApiPropertyOptional()
  @Expose()
  heroTitle?: string;

  @ApiPropertyOptional()
  @Expose()
  heroSubtitle?: string;

  @ApiProperty({ type: [String] })
  @Expose()
  heroImageUrls: string[];

  @ApiPropertyOptional({ example: 'What our customers say' })
  @Expose()
  reviewsSectionTitle?: string;

  @ApiPropertyOptional()
  @Expose()
  reviewsSectionDescription?: string;

  @ApiProperty({ example: true })
  @Expose()
  ctaEnabled: boolean;

  @ApiPropertyOptional()
  @Expose()
  ctaTitle?: string;

  @ApiPropertyOptional()
  @Expose()
  ctaDescription?: string;

  @ApiPropertyOptional()
  @Expose()
  ctaPrimaryLabel?: string;

  @ApiPropertyOptional()
  @Expose()
  ctaPrimaryLink?: string;

  @ApiPropertyOptional()
  @Expose()
  ctaSecondaryLabel?: string;

  @ApiPropertyOptional()
  @Expose()
  ctaSecondaryLink?: string;

  @ApiProperty({ enum: ['google', 'osm'], example: 'osm' })
  @Expose()
  mapsProvider: 'google' | 'osm';

  @ApiPropertyOptional({
    description:
      'Only present when mapsProvider is "google" and SUPER_ADMIN has configured a key.',
  })
  @Expose()
  googleMapsApiKey?: string;

  constructor(partial: Partial<PublicConfigResponseDto>) {
    Object.assign(this, partial);
  }
}
