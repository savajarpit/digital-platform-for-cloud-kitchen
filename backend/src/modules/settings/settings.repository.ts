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
import {
  ClosedDateEntry,
  normalizeClosedDates,
  withWeeklyOffClosures,
} from '../../common/utils/closed-dates.util';
import { DateUtil } from '../../common/utils/date.util';
import { type SlotFlow, usagesFor } from './delivery-slot-rules';

/** Weekly-off expansion window around today: far enough back for recent
 * subscription calendars, far enough ahead for any plan plus extensions. */
const WEEKLY_OFF_PAST_DAYS = 180;
const WEEKLY_OFF_FUTURE_DAYS = 400;

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBusinessProfile(tenantId: string): Promise<BusinessProfile | null> {
    return this.prisma.businessProfile.findUnique({ where: { tenantId } });
  }

  /** Just the SUPER_ADMIN-controlled "powered by" flag — used by the public
   * storefront config, never editable through this tenant-scoped module. */
  async findPoweredByBrandingEnabled(tenantId: string): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { poweredByBrandingEnabled: true },
    });
    return tenant?.poweredByBrandingEnabled ?? true;
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

  /** Closed dates for subscription scheduling, in the current object shape
   * (legacy bare dates upgraded), [] when the tenant has no order-acceptance
   * row yet. Weekly-off days from operating hours are included as
   * SUBSCRIPTIONS closures across a window wide enough for any live
   * subscription (see withWeeklyOffClosures). Only subscription code reads
   * this — the admin editor reads the raw settings row. */
  async findClosedDates(tenantId: string): Promise<ClosedDateEntry[]> {
    const settings = await this.findOrderAcceptanceSettings(tenantId);
    const today = new Date().toISOString().slice(0, 10);
    return withWeeklyOffClosures(
      normalizeClosedDates(settings?.closedDates),
      settings?.operatingHours,
      DateUtil.addDaysToDateStr(today, -WEEKLY_OFF_PAST_DAYS),
      DateUtil.addDaysToDateStr(today, WEEKLY_OFF_FUTURE_DAYS),
    );
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

  /** Active slots offered in `flow` (its own usage or BOTH). */
  findActiveDeliverySlots(
    tenantId: string,
    flow: SlotFlow,
  ): Promise<DeliverySlot[]> {
    return this.prisma.deliverySlot.findMany({
      where: { tenantId, isActive: true, usage: { in: usagesFor(flow) } },
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

  /** Another slot of this tenant with the same name, ignoring case. */
  findDeliverySlotByName(
    tenantId: string,
    name: string,
    excludeId?: string,
  ): Promise<DeliverySlot | null> {
    return this.prisma.deliverySlot.findFirst({
      where: {
        tenantId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  /** What still depends on a slot from `todayStr` on: live subscriptions
   * that chose it as their time, day changes moved onto it, and open
   * orders not yet delivered. Deleting the slot would null all of these
   * (the FKs are SET NULL), silently dropping a customer's chosen time. */
  async countDeliverySlotUsage(
    tenantId: string,
    slotId: string,
    todayStr: string,
  ): Promise<{ subscriptions: number; dayChanges: number; orders: number }> {
    const [subscriptions, dayChanges, orders] = await Promise.all([
      this.prisma.subscription.count({
        where: {
          tenantId,
          deliverySlotId: slotId,
          status: { in: ['ACTIVE', 'PENDING_PAYMENT'] },
        },
      }),
      this.prisma.subscriptionDayOverride.count({
        where: {
          deliverySlotId: slotId,
          date: { gte: todayStr },
          subscription: { tenantId, status: 'ACTIVE' },
        },
      }),
      this.prisma.order.count({
        where: {
          tenantId,
          deliverySlotId: slotId,
          deliveryDate: { gte: new Date(`${todayStr}T00:00:00.000Z`) },
          status: {
            in: [
              'PENDING_PAYMENT',
              'CONFIRMED',
              'PREPARING',
              'READY',
              'OUT_FOR_DELIVERY',
            ],
          },
        },
      }),
    ]);
    return { subscriptions, dayChanges, orders };
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

  findServiceablePincodeByPincode(
    tenantId: string,
    pincode: string,
  ): Promise<ServiceablePincode | null> {
    return this.prisma.serviceablePincode.findUnique({
      where: { tenantId_pincode: { tenantId, pincode } },
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

  /** What references a kitchen zone: its dining tables and waitlist entries
   * (the FKs RESTRICT, so a delete would fail) and the pickup / dine-in
   * orders placed there (SET NULL — they'd lose their outlet). */
  async countKitchenZoneUsage(
    tenantId: string,
    zoneId: string,
  ): Promise<{ tables: number; waitlist: number; orders: number }> {
    const [tables, waitlist, orders] = await Promise.all([
      this.prisma.diningTable.count({ where: { kitchenZoneId: zoneId } }),
      this.prisma.waitlistEntry.count({ where: { kitchenZoneId: zoneId } }),
      this.prisma.order.count({
        where: {
          tenantId,
          OR: [
            { pickupKitchenZoneId: zoneId },
            { dineInKitchenZoneId: zoneId },
          ],
        },
      }),
    ]);
    return { tables, waitlist, orders };
  }
}
