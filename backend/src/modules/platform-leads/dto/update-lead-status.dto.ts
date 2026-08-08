import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PlatformLeadStatus } from '../../../generated/prisma';

export class UpdateLeadStatusDto {
  @ApiProperty({ enum: PlatformLeadStatus })
  @IsEnum(PlatformLeadStatus)
  status: PlatformLeadStatus;
}
