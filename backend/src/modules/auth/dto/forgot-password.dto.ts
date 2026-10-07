import { IsEmail } from 'class-validator';
import { trimLowercase } from '../../../common/utils/trim.util';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(trimLowercase)
  email: string;
}
