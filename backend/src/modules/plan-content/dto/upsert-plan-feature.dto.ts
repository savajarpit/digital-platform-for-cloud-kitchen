import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertPlanFeatureDto {
  @ApiProperty({ example: '💰' })
  @IsString()
  icon: string;

  @ApiProperty({ example: 'Save up to 30%' })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: 'Subscribe and save compared to ordering individually.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
