import { IsString, IsStrongPassword } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'a1b2c3...' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'MyNewP@ssw0rd!', minLength: 8 })
  @IsStrongPassword({
    minLength: 8,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  newPassword: string;
}
