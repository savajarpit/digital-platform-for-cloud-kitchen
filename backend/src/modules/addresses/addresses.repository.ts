import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Address, Prisma, ServiceablePincode } from '../../generated/prisma';

export interface KitchenGeoSettings {
  kitchenLat: number | null;
  kitchenLng: number | null;
  deliveryRadiusMeters: number | null;
  deliveryFee: number | null;
  minOrderAmount: number | null;
  freeDeliveryAboveAmount: number | null;
}

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

  findKitchenGeoSettings(tenantId: string): Promise<KitchenGeoSettings | null> {
    return this.prisma.businessProfile.findUnique({
      where: { tenantId },
      select: {
        kitchenLat: true,
        kitchenLng: true,
        deliveryRadiusMeters: true,
        deliveryFee: true,
        minOrderAmount: true,
        freeDeliveryAboveAmount: true,
      },
    });
  }
}
