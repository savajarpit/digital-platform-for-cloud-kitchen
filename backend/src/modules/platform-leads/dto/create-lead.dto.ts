import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeadDto {
  @ApiProperty({ example: 'Healthicious Kitchen' })
  @IsString()
  @MaxLength(120)
  businessName: string;

  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail()
  contactEmail: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
