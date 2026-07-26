import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Deliberately excludes email, password, and role — this backs the
 * customer/staff self-service "my profile" endpoint, not admin user
 * management. Changing email would need OTP re-verification (not built
 * yet); role/password must never be settable by the user themself here.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'Phone must be in E.164 format, e.g. +919876543210',
  })
  phone?: string;
}
