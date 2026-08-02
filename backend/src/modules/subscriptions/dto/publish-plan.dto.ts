import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PublishPlanDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isPublished: boolean;
}
