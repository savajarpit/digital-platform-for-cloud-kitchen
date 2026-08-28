import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCancellationRequestDto {
  @ApiProperty({ example: "We're closing the kitchen for renovations." })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason: string;
}
