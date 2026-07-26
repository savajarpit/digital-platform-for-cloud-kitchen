import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetGrantDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  granted: boolean;
}
