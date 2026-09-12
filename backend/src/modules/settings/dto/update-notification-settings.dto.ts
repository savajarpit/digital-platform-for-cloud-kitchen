import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmailProvider, WhatsappProvider } from '../../../generated/prisma';
import {
  INDIA_PHONE_MESSAGE,
  INDIA_PHONE_REGEX,
} from '../../../common/constants/phone.constant';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  whatsappEnabled?: boolean;

  @ApiPropertyOptional({ enum: WhatsappProvider })
  @IsOptional()
  @IsEnum(WhatsappProvider)
  whatsappProvider?: WhatsappProvider;

  @ApiPropertyOptional({
    description:
      "Plaintext in, encrypted before storage. Omit to leave unchanged. The provider's single secret token — Interakt's API key, Twilio's Auth Token.",
  })
  @IsOptional()
  @IsString()
  // A copy-pasted secret carrying a stray leading/trailing space or
  // newline (easy to pick up from a console's "select the text" flow
  // instead of its copy-icon) silently corrupts the value — Twilio in
  // particular returns a bare 401 with no useful body for a mangled
  // Account SID, which is a nasty one to debug blind. Trimming here
  // removes an entire class of "credentials look right but don't work".
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  whatsappApiKey?: string;

  @ApiPropertyOptional({
    description:
      'Plaintext in (e.g. { accountSid } for Twilio), encrypted before storage. Omit to leave unchanged. Providers with only one secret (Interakt) never need this.',
  })
  @IsOptional()
  @IsObject()
  // Every string value gets the same trim as whatsappApiKey above, same
  // reasoning — accountSid is exactly as prone to a stray pasted space.
  @Transform(({ value }: { value: unknown }) => {
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        typeof v === 'string' ? v.trim() : v,
      ]),
    );
  })
  whatsappConfig?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      "The WhatsApp Business sender number/ID — not always an Indian number (e.g. Twilio's sandbox uses a US number), so this isn't format-restricted.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  whatsappSenderNumber?: string;

  @ApiPropertyOptional({
    example: '+919876543210',
    description: "The tenant owner's own number for order alerts.",
  })
  @IsOptional()
  @Matches(INDIA_PHONE_REGEX, { message: INDIA_PHONE_MESSAGE })
  ownerWhatsappNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ enum: EmailProvider })
  @IsOptional()
  @IsEnum(EmailProvider)
  emailProvider?: EmailProvider;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  emailFromAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  emailFromName?: string;

  @ApiPropertyOptional({
    description:
      'Plaintext in (e.g. { host, port, secure, user, password } for SMTP), encrypted before storage. Omit to leave unchanged.',
  })
  @IsOptional()
  @IsObject()
  emailConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  ownerNotificationEmail?: string;
}
