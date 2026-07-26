import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OffsetPaginationDto } from '../../../common/dto/pagination.dto';

export class QueryCustomersDto extends OffsetPaginationDto {
  @ApiPropertyOptional({ description: 'Search by first/last name or email' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
