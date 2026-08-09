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

  @ApiProperty({
    example: 2,
    description: 'How many days ahead a customer may schedule delivery',
  })
  @Expose()
  maxAdvanceOrderDays: number;

  @ApiProperty({ example: false })
  @Expose()
  showReviewsOnHomepage: boolean;

  constructor(partial: Partial<PublicConfigResponseDto>) {
    Object.assign(this, partial);
  }
}
