import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetFeatureDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}
