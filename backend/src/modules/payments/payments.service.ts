import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { OrdersRepository } from '../orders/orders.repository';
import { WebhookEventsRepository } from './webhook-events.repository';
import { RazorpayClientService } from '../../shared-modules/razorpay/razorpay-client.service';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaymentStatus } from '../../generated/prisma';
import { OrderConfirmedJob } from '../notifications/notifications.processor';

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
      };
    };
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly ordersRepo: OrdersRepository,
    private readonly razorpayClient: RazorpayClientService,
    private readonly webhookEventsRepo: WebhookEventsRepository,
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue<OrderConfirmedJob>,
  ) {}

  /**
   * jobId is deterministic (order-confirmed:{orderId}) on purpose — both the
   * client-side verify call and the webhook can independently reach the
   * "just got marked PAID" moment for the same order, and Bull treats a
   * duplicate jobId as a no-op rather than a second job, so this is safe to
   * call from both paths without double-notifying the customer.
   */
  private async enqueueOrderConfirmation(
    tenantId: string,
    orderId: string,
  ): Promise<void> {
    await this.notificationsQueue.add(
      'order-confirmed',
      { tenantId, orderId },
      { jobId: `order-confirmed:${orderId}` },
    );
  }

  async verifyPayment(
    tenantId: string,
    userId: string,
    dto: VerifyPaymentDto,
  ): Promise<{ confirmed: true }> {
    const order = await this.ordersRepo.findByRazorpayOrderId(
      dto.razorpayOrderId,
    );
    if (!order || order.tenantId !== tenantId || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    // Both the client-side verify call and the webhook can fire for the
    // same payment — this must be safe to call twice.
    if (order.paymentStatus === PaymentStatus.PAID) {
      return { confirmed: true };
    }

    const valid = await this.razorpayClient.verifyPaymentSignature(
      tenantId,
      dto,
    );
    if (!valid) {
      throw new BadRequestException('Payment verification failed');
    }

    await this.ordersRepo.markPaid(order.id, dto.razorpayPaymentId);
    await this.enqueueOrderConfirmation(tenantId, order.id);
    return { confirmed: true };
  }

  async handleWebhook(
    rawBody: Buffer,
    signature: string | undefined,
    eventIdHeader: string | undefined,
  ): Promise<void> {
    if (!signature) throw new BadRequestException('Missing webhook signature');

    let payload: RazorpayWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhookPayload;
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    const paymentEntity = payload.payload?.payment?.entity;
    const razorpayOrderId = paymentEntity?.order_id;
    if (!razorpayOrderId) {
      // An event type we don't act on (e.g. not payment-related) — ack and ignore.
      return;
    }

    const order = await this.ordersRepo.findByRazorpayOrderId(razorpayOrderId);
    if (!order) {
      this.logger.warn(`Webhook for unknown Razorpay order ${razorpayOrderId}`);
      return;
    }

    const valid = await this.razorpayClient.verifyWebhookSignature(
      order.tenantId,
      rawBody,
      signature,
    );
    if (!valid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const eventId =
      eventIdHeader ??
      `${razorpayOrderId}:${payload.event}:${paymentEntity?.id}`;
    const existing = await this.webhookEventsRepo.findByEventId(eventId);
    if (existing?.status === 'PROCESSED') return;

    const record =
      existing ??
      (await this.webhookEventsRepo.create(
        eventId,
        payload.event ?? 'unknown',
      ));

    try {
      if (
        payload.event === 'payment.captured' ||
        payload.event === 'order.paid'
      ) {
        if (order.paymentStatus !== PaymentStatus.PAID && paymentEntity?.id) {
          await this.ordersRepo.markPaid(order.id, paymentEntity.id);
          await this.enqueueOrderConfirmation(order.tenantId, order.id);
        }
      } else if (payload.event === 'payment.failed') {
        await this.ordersRepo.markFailed(order.id);
      }
      await this.webhookEventsRepo.markProcessed(record.id);
    } catch (error) {
      await this.webhookEventsRepo.markFailed(
        record.id,
        (error as Error).message,
      );
      throw error;
    }
  }
}
