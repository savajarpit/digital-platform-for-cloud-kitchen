import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertPlanFaqDto {
  @ApiProperty({ example: 'Can I skip or pause my subscription?' })
  @IsString()
  question: string;

  @ApiProperty({
    example:
      'Yes — you can skip any single day or pause for a date range anytime from your account.',
  })
  @IsString()
  answer: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
