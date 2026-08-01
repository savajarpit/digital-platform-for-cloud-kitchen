import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OffsetPaginationDto } from '../../../common/dto/pagination.dto';

export class QueryAdminMealsDto extends OffsetPaginationDto {
  @ApiPropertyOptional({ example: 'b3f1c2a0-...' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'quinoa' })
  @IsOptional()
  @IsString()
  search?: string;
}
