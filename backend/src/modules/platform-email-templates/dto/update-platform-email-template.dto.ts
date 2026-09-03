import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlatformEmailTemplateDto {
  @ApiProperty({ example: 'Welcome to {{businessName}}, {{firstName}}!' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject: string;

  @ApiProperty({ example: '<p>Hi {{firstName}},</p>...' })
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  bodyHtml: string;
}
