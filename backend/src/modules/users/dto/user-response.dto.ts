import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * `@Exclude()` at the class level makes this an allow-list — only fields
 * explicitly marked `@Expose()` below survive serialization. Without it,
 * class-transformer's default strategy passes through any own property
 * `Object.assign` copied onto the instance (tenantId, status, verifiedAt,
 * updatedAt...) even though they're never declared here.
 */
@Exclude()
export class UserResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty()
  @Expose()
  firstName: string;

  @ApiProperty()
  @Expose()
  lastName?: string | null;

  @ApiProperty()
  @Expose()
  phone?: string | null;

  @ApiProperty()
  @Expose()
  role: string;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @Exclude()
  passwordHash: string;

  @Exclude()
  deletedAt: Date | null;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
