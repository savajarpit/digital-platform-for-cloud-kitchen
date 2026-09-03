import {
  IsBoolean,
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

  @ApiPropertyOptional({
    description:
      'Whether the "Powered by OkaySync" line shows on this tenant\'s storefront footer and customer-facing emails — SUPER_ADMIN-only, never editable by the tenant itself',
  })
  @IsOptional()
  @IsBoolean()
  poweredByBrandingEnabled?: boolean;
}
