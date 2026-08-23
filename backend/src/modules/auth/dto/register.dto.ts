import {
  Equals,
  IsBoolean,
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsStrongPassword,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  INDIA_PHONE_MESSAGE,
  INDIA_PHONE_REGEX,
} from '../../../common/constants/phone.constant';

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'MyP@ssw0rd!', minLength: 8 })
  @IsStrongPassword({
    minLength: 8,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({
    example: '+919876543210',
    description:
      'WhatsApp-reachable Indian mobile number, in E.164 format. Optional — OTP always also goes to email.',
  })
  @IsOptional()
  @Matches(INDIA_PHONE_REGEX, { message: INDIA_PHONE_MESSAGE })
  phone?: string;

  @ApiProperty({
    example: true,
    description:
      "Must be true — confirms the customer accepted this business's own Terms of Service and Privacy Policy.",
  })
  @IsBoolean()
  @Equals(true, {
    message:
      'You must accept the Terms of Service and Privacy Policy to sign up',
  })
  termsAccepted: boolean;
}
