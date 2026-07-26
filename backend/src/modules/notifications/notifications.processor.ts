import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
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

    const attempts = await this.notificationsService.sendOrderConfirmation(
      settings,
      {
        customerName:
          `${order.user.firstName} ${order.user.lastName ?? ''}`.trim(),
        customerEmail: order.user.email,
        customerWhatsAppNumber: order.address.contactPhone,
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
