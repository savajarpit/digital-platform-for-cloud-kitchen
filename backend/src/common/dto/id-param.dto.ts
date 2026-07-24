import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IdParamDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsUUID()
  id: string;
}
