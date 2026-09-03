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
  whatsappApiKey?: string;

  @ApiPropertyOptional({
    description:
      'Plaintext in (e.g. { accountSid } for Twilio), encrypted before storage. Omit to leave unchanged. Providers with only one secret (Interakt) never need this.',
  })
  @IsOptional()
  @IsObject()
  whatsappConfig?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      "The WhatsApp Business sender number/ID — not always an Indian number (e.g. Twilio's sandbox uses a US number), so this isn't format-restricted.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
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
