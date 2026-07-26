import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmailProvider, WhatsappProvider } from '../../../generated/prisma';

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
      'Plaintext in, encrypted before storage. Omit to leave unchanged.',
  })
  @IsOptional()
  @IsString()
  whatsappApiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsappSenderNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
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
