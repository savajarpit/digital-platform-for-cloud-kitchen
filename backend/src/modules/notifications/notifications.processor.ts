import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { buildGoogleMapsLink } from './templates/email/order-confirmation-customer.template';
import { NotificationLogsRepository } from './notification-logs.repository';
import { OrdersRepository } from '../orders/orders.repository';
import { SettingsRepository } from '../settings/settings.repository';

export interface OrderConfirmedJob {
  tenantId: string;
  orderId: string;
}

@Processor('notifications')
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationLogsRepo: NotificationLogsRepository,
    private readonly ordersRepo: OrdersRepository,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  @Process('order-confirmed')
  async handleOrderConfirmed(job: Job<OrderConfirmedJob>): Promise<void> {
    const { tenantId, orderId } = job.data;

    const order = await this.ordersRepo.findForNotification(tenantId, orderId);
    if (!order) {
      this.logger.warn(`order-confirmed job for missing order ${orderId}`);
      return;
    }

    const settings = await this.settingsRepo.findNotificationSettings(tenantId);

    // PICKUP orders have no Address row at all — fall back to the pickup
    // zone's own presentable address/coordinates and the account's own
    // phone number (there's no per-order contact phone without an address).
    const isPickup = order.fulfillmentType === 'PICKUP';
    const deliveryAddress = isPickup
      ? `Pickup: ${order.pickupKitchenZone?.pickupAddress ?? ''}`
      : [
          order.address?.line1,
          order.address?.line2,
          order.address?.city,
          order.address?.state,
          order.address?.pincode,
        ]
          .filter(Boolean)
          .join(', ');
    const contactPhone = isPickup
      ? (order.user.phone ?? '')
      : (order.address?.contactPhone ?? '');
    const mapLink = isPickup
      ? order.pickupKitchenZone
        ? buildGoogleMapsLink(order.pickupKitchenZone.lat, order.pickupKitchenZone.lng)
        : undefined
      : order.address?.lat != null && order.address?.lng != null
        ? buildGoogleMapsLink(order.address.lat, order.address.lng)
        : undefined;

    const attempts = await this.notificationsService.sendOrderConfirmation(
      settings,
      {
        customerName:
          `${order.user.firstName} ${order.user.lastName ?? ''}`.trim(),
        customerEmail: order.user.email,
        customerWhatsAppNumber: contactPhone || undefined,
        orderNumber: order.orderNumber,
        totalInPaise: order.totalInPaise,
        deliverySlotName: order.deliverySlotName,
        deliveryWindowStart: order.deliveryWindowStart,
        deliveryWindowEnd: order.deliveryWindowEnd,
        deliveryDateLabel: order.deliveryDate.toISOString().slice(0, 10),
        items: order.items.map((item) => ({
          name: item.nameSnapshot,
          quantity: item.quantity,
        })),
        deliveryAddress,
        deliveryContactPhone: contactPhone,
        mapLink,
      },
    );

    await this.notificationLogsRepo.createMany(tenantId, orderId, attempts);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Notification job ${job.name} failed after ${job.attemptsMade} attempts`,
      error.stack,
    );
  }
}
