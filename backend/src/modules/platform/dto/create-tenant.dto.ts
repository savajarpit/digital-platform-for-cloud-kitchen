import {
  IsEmail,
  IsOptional,
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateTenantDto {
  @ApiProperty({ example: 'Healthicious Kitchen' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  businessName: string;

  @ApiPropertyOptional({ example: 'healthicious.in' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customDomain?: string;

  @ApiProperty({ example: 'owner@healthicious.in' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  ownerEmail: string;

  @ApiProperty({ example: 'TempP@ssw0rd!', minLength: 8 })
  @IsStrongPassword({
    minLength: 8,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  ownerPassword: string;

  @ApiProperty({ example: 'Anita' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  ownerFirstName: string;

  @ApiPropertyOptional({ example: 'Sharma' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ownerLastName?: string;
}
