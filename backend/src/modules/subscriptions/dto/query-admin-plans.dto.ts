import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OffsetPaginationDto } from '../../../common/dto/pagination.dto';

export class QueryAdminPlansDto extends OffsetPaginationDto {
  @ApiPropertyOptional({ example: 'weight loss' })
  @IsOptional()
  @IsString()
  search?: string;
}
