import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RejectCancellationRequestDto {
  // Required: the customer is emailed this, so a rejection always says why.
  @ApiProperty({ example: 'We’ve paused your plan for two weeks instead.' })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MinLength(3, { message: 'Add a short note for the customer.' })
  @MaxLength(500)
  note: string;
}
