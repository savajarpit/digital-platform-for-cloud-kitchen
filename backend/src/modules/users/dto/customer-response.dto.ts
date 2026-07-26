import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import type { CustomerWithOrderCount } from '../users.repository';

/** `@Exclude()` allow-list, same reasoning as UserResponseDto — never let
 * passwordHash or other internal fields leak through class-transformer's
 * default pass-through behavior. */
@Exclude()
export class CustomerResponseDto {
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
  isActive: boolean;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Number of non-abandoned orders placed' })
  @Expose()
  orderCount: number;

  constructor(user: CustomerWithOrderCount) {
    this.id = user.id;
    this.email = user.email;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.phone = user.phone;
    this.isActive = user.isActive;
    this.createdAt = user.createdAt;
    this.orderCount = user._count.orders;
  }
}
