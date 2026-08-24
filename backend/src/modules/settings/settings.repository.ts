import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  BusinessProfile,
  DeliverySlot,
  HomePageContent,
  InstantDeliverySettings,
  KitchenZone,
  NotificationSettings,
  OrderAcceptanceSettings,
  PaymentSettings,
  Prisma,
  ServiceablePincode,
} from '../../generated/prisma';

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBusinessProfile(tenantId: string): Promise<BusinessProfile | null> {
    return this.prisma.businessProfile.findUnique({ where: { tenantId } });
  }

  updateBusinessProfile(
    tenantId: string,
    data: Prisma.BusinessProfileUpdateInput,
  ): Promise<BusinessProfile> {
    return this.prisma.businessProfile.update({ where: { tenantId }, data });
  }

  findHomePageContent(tenantId: string): Promise<HomePageContent | null> {
    return this.prisma.homePageContent.findUnique({ where: { tenantId } });
  }

  upsertHomePageContent(
    tenantId: string,
    data: Omit<Prisma.HomePageContentUncheckedCreateInput, 'tenantId'>,
  ): Promise<HomePageContent> {
    return this.prisma.homePageContent.upsert({
      where: { tenantId },
      update: data,
      create: { ...data, tenantId },
    });
  }

  findOrderAcceptanceSettings(
    tenantId: string,
  ): Promise<OrderAcceptanceSettings | null> {
    return this.prisma.orderAcceptanceSettings.findUnique({
      where: { tenantId },
    });
  }

  upsertOrderAcceptanceSettings(
    tenantId: string,
    data: Omit<Prisma.OrderAcceptanceSettingsUncheckedCreateInput, 'tenantId'>,
  ): Promise<OrderAcceptanceSettings> {
    return this.prisma.orderAcceptanceSettings.upsert({
      where: { tenantId },
      update: data,
      create: { ...data, tenantId },
    });
  }

  findNotificationSettings(
    tenantId: string,
  ): Promise<NotificationSettings | null> {
    return this.prisma.notificationSettings.findUnique({
      where: { tenantId },
    });
  }

  upsertNotificationSettings(
    tenantId: string,
    data: Omit<Prisma.NotificationSettingsUncheckedCreateInput, 'tenantId'>,
  ): Promise<NotificationSettings> {
    return this.prisma.notificationSettings.upsert({
      where: { tenantId },
      update: data,
      create: { ...data, tenantId },
    });
  }

  findPaymentSettings(tenantId: string): Promise<PaymentSettings | null> {
    return this.prisma.paymentSettings.findUnique({ where: { tenantId } });
  }

  upsertPaymentSettings(
    tenantId: string,
    data: Omit<Prisma.PaymentSettingsUncheckedCreateInput, 'tenantId'>,
  ): Promise<PaymentSettings> {
    return this.prisma.paymentSettings.upsert({
      where: { tenantId },
      update: data,
      create: { ...data, tenantId },
    });
  }

  findInstantDeliverySettings(
    tenantId: string,
  ): Promise<InstantDeliverySettings | null> {
    return this.prisma.instantDeliverySettings.findUnique({
      where: { tenantId },
    });
  }

  upsertInstantDeliverySettings(
    tenantId: string,
    data: Omit<Prisma.InstantDeliverySettingsUncheckedCreateInput, 'tenantId'>,
  ): Promise<InstantDeliverySettings> {
    return this.prisma.instantDeliverySettings.upsert({
      where: { tenantId },
      update: data,
      create: { ...data, tenantId },
    });
  }

  findActiveDeliverySlots(tenantId: string): Promise<DeliverySlot[]> {
    return this.prisma.deliverySlot.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findAllDeliverySlots(tenantId: string): Promise<DeliverySlot[]> {
    return this.prisma.deliverySlot.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findDeliverySlotById(
    tenantId: string,
    id: string,
  ): Promise<DeliverySlot | null> {
    return this.prisma.deliverySlot.findFirst({ where: { id, tenantId } });
  }

  createDeliverySlot(
    tenantId: string,
    data: Omit<Prisma.DeliverySlotUncheckedCreateInput, 'tenantId'>,
  ): Promise<DeliverySlot> {
    return this.prisma.deliverySlot.create({ data: { ...data, tenantId } });
  }

  updateDeliverySlot(
    id: string,
    data: Prisma.DeliverySlotUncheckedUpdateInput,
  ): Promise<DeliverySlot> {
    return this.prisma.deliverySlot.update({ where: { id }, data });
  }

  deleteDeliverySlot(id: string): Promise<DeliverySlot> {
    return this.prisma.deliverySlot.delete({ where: { id } });
  }

  findAllServiceablePincodes(tenantId: string): Promise<ServiceablePincode[]> {
    return this.prisma.serviceablePincode.findMany({
      where: { tenantId },
      orderBy: { pincode: 'asc' },
    });
  }

  findServiceablePincodeById(
    tenantId: string,
    id: string,
  ): Promise<ServiceablePincode | null> {
    return this.prisma.serviceablePincode.findFirst({
      where: { id, tenantId },
    });
  }

  createServiceablePincode(
    tenantId: string,
    data: Omit<Prisma.ServiceablePincodeUncheckedCreateInput, 'tenantId'>,
  ): Promise<ServiceablePincode> {
    return this.prisma.serviceablePincode.create({
      data: { ...data, tenantId },
    });
  }

  updateServiceablePincode(
    id: string,
    data: Prisma.ServiceablePincodeUncheckedUpdateInput,
  ): Promise<ServiceablePincode> {
    return this.prisma.serviceablePincode.update({ where: { id }, data });
  }

  deleteServiceablePincode(id: string): Promise<ServiceablePincode> {
    return this.prisma.serviceablePincode.delete({ where: { id } });
  }

  findAllKitchenZones(tenantId: string): Promise<KitchenZone[]> {
    return this.prisma.kitchenZone.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  findKitchenZoneById(
    tenantId: string,
    id: string,
  ): Promise<KitchenZone | null> {
    return this.prisma.kitchenZone.findFirst({ where: { id, tenantId } });
  }

  createKitchenZone(
    tenantId: string,
    data: Omit<Prisma.KitchenZoneUncheckedCreateInput, 'tenantId'>,
  ): Promise<KitchenZone> {
    return this.prisma.kitchenZone.create({ data: { ...data, tenantId } });
  }

  updateKitchenZone(
    id: string,
    data: Prisma.KitchenZoneUncheckedUpdateInput,
  ): Promise<KitchenZone> {
    return this.prisma.kitchenZone.update({ where: { id }, data });
  }

  deleteKitchenZone(id: string): Promise<KitchenZone> {
    return this.prisma.kitchenZone.delete({ where: { id } });
  }
}
