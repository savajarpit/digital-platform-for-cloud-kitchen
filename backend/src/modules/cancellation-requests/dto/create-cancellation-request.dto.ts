import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CANCELLATION_REASON_CODES,
  type CancellationReasonCode,
} from '../cancellation-requests.constants';

export class CreateCancellationRequestDto {
  @ApiProperty({ enum: CANCELLATION_REASON_CODES, example: 'MOVING' })
  @IsIn(CANCELLATION_REASON_CODES, { message: 'Please pick a reason.' })
  reason: CancellationReasonCode;

  @ApiPropertyOptional({ example: 'Shifting to Pune next week.' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @MaxLength(500)
  note?: string;
}
