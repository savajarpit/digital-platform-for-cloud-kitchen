import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlatformTermsDto {
  @ApiProperty({ example: '## Platform Terms & Conditions\n\n...' })
  @IsString()
  @MinLength(1)
  content: string;
}
