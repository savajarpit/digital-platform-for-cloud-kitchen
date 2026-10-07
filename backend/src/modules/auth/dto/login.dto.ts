import { IsEmail, IsString, MinLength } from 'class-validator';
import { trimLowercase } from '../../../common/utils/trim.util';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(trimLowercase)
  email: string;

  @ApiProperty({ example: 'MyP@ssw0rd!' })
  @IsString()
  @MinLength(6)
  password: string;
}
