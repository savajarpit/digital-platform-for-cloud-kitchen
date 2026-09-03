import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertTenantEmailTemplateDto {
  @ApiProperty({ example: 'Order confirmed — {{orderNumber}}' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject: string;

  @ApiProperty({ example: '<p>Hi {{customerName}},</p>...' })
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  bodyHtml: string;
}
