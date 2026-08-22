import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

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
      "Google Search Console verification content, rendered as a <meta name=\"google-site-verification\"> tag when set",
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

  constructor(partial: Partial<PublicConfigResponseDto>) {
    Object.assign(this, partial);
  }
}
