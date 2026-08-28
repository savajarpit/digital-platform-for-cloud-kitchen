import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PlatformCancellationRequestStatus } from '../../../generated/prisma';

export class UpdateCancellationRequestStatusDto {
  @ApiProperty({ enum: PlatformCancellationRequestStatus })
  @IsEnum(PlatformCancellationRequestStatus)
  status: PlatformCancellationRequestStatus;
}
