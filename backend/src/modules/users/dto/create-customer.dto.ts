import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { trimString, trimToUndefined } from '../../../common/utils/trim.util';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  INDIA_PHONE_MESSAGE,
  INDIA_PHONE_REGEX,
} from '../../../common/constants/phone.constant';
import { CreateAddressDto } from '../../addresses/dto/create-address.dto';

/** Admin-side customer creation (phone-in orders). Deliberately has no
 * password/role/tenantId — the role is always CUSTOMER, the tenant comes
 * from the admin's own context, and the customer sets their own password
 * through the invite link. */
export class CreateCustomerDto {
  @ApiProperty({ example: 'priya@example.com' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email: string;

  @ApiProperty({ example: 'Priya' })
  @Transform(trimString)
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters.' })
  @MaxLength(50)
  firstName: string;

  @ApiPropertyOptional({ example: 'Shah' })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @Matches(INDIA_PHONE_REGEX, { message: INDIA_PHONE_MESSAGE })
  phone?: string;

  @ApiPropertyOptional({
    type: CreateAddressDto,
    description: 'Optional first delivery address, saved as the default',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Email the customer a link to set their password',
  })
  @IsOptional()
  @IsBoolean()
  sendInvite?: boolean;
}
