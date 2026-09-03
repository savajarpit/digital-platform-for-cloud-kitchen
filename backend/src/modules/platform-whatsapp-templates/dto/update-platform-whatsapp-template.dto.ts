import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WhatsAppPlaceholderDto {
  @ApiProperty({ example: 'name' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  paramKey: string;

  @ApiProperty({ example: 'Customer name' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label: string;
}

export class UpdatePlatformWhatsAppTemplateDto {
  @ApiProperty({
    example: 'order_confirmation_customer',
    description: 'The real Meta/Interakt-approved template name',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  templateKey: string;

  @ApiProperty({ type: [WhatsAppPlaceholderDto] })
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => WhatsAppPlaceholderDto)
  placeholders: WhatsAppPlaceholderDto[];
}
