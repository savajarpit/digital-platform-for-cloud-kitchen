import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MapsProvider } from '../../../generated/prisma';

export class UpdatePlatformSettingsDto {
  @ApiPropertyOptional({
    description:
      'Platform-wide kill-switch for WhatsApp OTP delivery — off by default, OTP goes out over email only until enabled here. Does not affect order-confirmation/subscription-disruption WhatsApp sends, which stay gated per-tenant.',
  })
  @IsOptional()
  @IsBoolean()
  whatsappOtpEnabled?: boolean;

  @ApiPropertyOptional({
    enum: MapsProvider,
    description:
      "Which map provider every tenant's storefront (address picker, kitchen zone picker) renders. OSM (Leaflet + Nominatim) needs no key/billing. GOOGLE needs googleMapsApiKey set too, plus the Maps JavaScript + Places APIs enabled on that Google Cloud project.",
  })
  @IsOptional()
  @IsEnum(MapsProvider)
  mapsProvider?: MapsProvider;

  @ApiPropertyOptional({
    description:
      "Google Maps API key, sent as-is; omit to leave the currently stored key untouched. This is not a server-side secret — it necessarily reaches every storefront visitor's browser to call Google's Maps/Places APIs, so restrict it by HTTP referrer in the Google Cloud Console rather than relying on secrecy.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  // Same reasoning as the WhatsApp/SMTP credential fields — a pasted key
  // easily picks up a stray leading/trailing space or newline, which
  // silently breaks it.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  googleMapsApiKey?: string;
}
