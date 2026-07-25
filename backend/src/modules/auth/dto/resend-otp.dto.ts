import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendOtpDto {
  @ApiProperty({ example: 'b3f1c2a0-...' })
  @IsString()
  userId: string;
}
