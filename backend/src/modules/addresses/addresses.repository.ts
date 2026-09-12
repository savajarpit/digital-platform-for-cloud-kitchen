import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  Address,
  KitchenZone,
  Prisma,
  ServiceablePincode,
} from '../../generated/prisma';

@Injectable()
export class AddressesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(tenantId: string, userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: { tenantId, userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findById(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<Address | null> {
    return this.prisma.address.findFirst({ where: { id, tenantId, userId } });
  }

  create(
    tenantId: string,
    userId: string,
    data: Omit<Prisma.AddressUncheckedCreateInput, 'tenantId' | 'userId'>,
  ): Promise<Address> {
    return this.prisma.address.create({ data: { ...data, tenantId, userId } });
  }

  update(
    id: string,
    data: Prisma.AddressUncheckedUpdateInput,
  ): Promise<Address> {
    return this.prisma.address.update({ where: { id }, data });
  }

  delete(id: string): Promise<Address> {
    return this.prisma.address.delete({ where: { id } });
  }

  /** True if any Order/Subscription/SubscriptionDayOverride still points at
   * this address — deleting it out from under one of those would either
   * corrupt a past order's delivery record (pre-snapshot rows) or break a
   * live subscription's default address entirely. */
  async isReferenced(id: string): Promise<boolean> {
    const [orderCount, subscriptionCount, overrideCount] = await Promise.all([
      this.prisma.order.count({ where: { addressId: id } }),
      this.prisma.subscription.count({ where: { addressId: id } }),
      this.prisma.subscriptionDayOverride.count({ where: { addressId: id } }),
    ]);
    return orderCount + subscriptionCount + overrideCount > 0;
  }

  /** Clears isDefault on every other address for this user (before setting a new default). */
  clearDefaultForUser(
    tenantId: string,
    userId: string,
    exceptId?: string,
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.address.updateMany({
      where: {
        tenantId,
        userId,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { isDefault: false },
    });
  }

  findServiceablePincode(
    tenantId: string,
    pincode: string,
  ): Promise<ServiceablePincode | null> {
    return this.prisma.serviceablePincode.findUnique({
      where: { tenantId_pincode: { tenantId, pincode } },
    });
  }

  /** A tenant may have several outlets — a location is serviceable if it
   * falls within ANY active zone's radius (nearest match wins on fee). */
  findActiveKitchenZones(tenantId: string): Promise<KitchenZone[]> {
    return this.prisma.kitchenZone.findMany({
      where: { tenantId, isActive: true },
    });
  }
}
