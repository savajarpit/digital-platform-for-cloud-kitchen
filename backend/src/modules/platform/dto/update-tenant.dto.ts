import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '../../../generated/prisma';

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  businessName?: string;

  @ApiPropertyOptional({ example: 'healthicious.in' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customDomain?: string;

  @ApiPropertyOptional({ enum: Status })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
