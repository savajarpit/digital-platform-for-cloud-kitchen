import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export type MealSortOption = 'price_asc' | 'price_desc';

export class QueryMealsDto {
  @ApiPropertyOptional({ example: 'b3f1c2a0-...' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'quinoa' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isVegetarian?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isPopular?: boolean;

  @ApiPropertyOptional({ enum: ['price_asc', 'price_desc'] })
  @IsOptional()
  @IsIn(['price_asc', 'price_desc'])
  sortBy?: MealSortOption;
}
