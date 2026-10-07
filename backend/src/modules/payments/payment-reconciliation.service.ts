import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersRepository } from '../orders/orders.repository';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { RazorpayClientService } from '../../shared-modules/razorpay/razorpay-client.service';
import {
  JobRunnerService,
  type JobSummary,
} from '../../shared-modules/jobs/job-runner.service';
import { PaymentsService } from './payments.service';

/** Leave a payment alone this long — the customer may still be on the
 * Razorpay screen, and the browser confirmation usually lands first. */
export const RECONCILE_MIN_AGE_MS = 3 * 60 * 1000;
/** After this, an unpaid online payment is abandoned. */
export const RECONCILE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** Most Razorpay lookups per kind per run — a bad day can't flood a run. */
export const RECONCILE_BATCH = 50;
const LOCK_TTL_SECONDS = 4 * 60;

/**
 * The guaranteed path for online payments. A payment is normally confirmed
 * by the customer's browser right after paying, or by Razorpay's webhook if
 * the business set one up — but a closed tab, dropped connection or missing
 * webhook would leave a paid order/subscription stuck as "pending". Every
 * five minutes this asks Razorpay directly about each payment still pending
 * (3 min – 24 h old), confirms the captured ones through the same code the
 * webhook uses, and marks payments older than 24 h as failed (abandoned).
 *
 * Cheap by design: one indexed query per kind that normally returns
 * nothing; Razorpay is only called for a payment that's actually stuck.
 */
@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);

  constructor(
    private readonly ordersRepo: OrdersRepository,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly razorpayClient: RazorpayClientService,
    private readonly paymentsService: PaymentsService,
    private readonly jobRunner: JobRunnerService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async reconcileOnSchedule(): Promise<void> {
    await this.jobRunner.run('payment-reconciliation', LOCK_TTL_SECONDS, () =>
      this.reconcile(new Date()),
    );
  }

  async reconcile(now: Date): Promise<JobSummary> {
    const from = new Date(now.getTime() - RECONCILE_MAX_AGE_MS);
    const to = new Date(now.getTime() - RECONCILE_MIN_AGE_MS);
    const summary = {
      ordersChecked: 0,
      ordersConfirmed: 0,
      invoicesChecked: 0,
      invoicesConfirmed: 0,
      lookupErrors: 0,
      ordersAbandoned: 0,
      invoicesAbandoned: 0,
    };

    const orders = await this.ordersRepo.findPendingRazorpayOrders(
      from,
      to,
      RECONCILE_BATCH,
    );
    for (const order of orders) {
      summary.ordersChecked += 1;
      const paymentId = await this.lookup(
        order.tenantId,
        order.razorpayOrderId!,
      );
      if (paymentId === undefined) summary.lookupErrors += 1;
      else if (paymentId) {
        await this.paymentsService.confirmOrderPayment(order, paymentId);
        summary.ordersConfirmed += 1;
      }
    }

    const invoices =
      await this.subscriptionsService.findPendingRazorpayInvoices(
        from,
        to,
        RECONCILE_BATCH,
      );
    for (const invoice of invoices) {
      summary.invoicesChecked += 1;
      const paymentId = await this.lookup(
        invoice.tenantId,
        invoice.razorpayOrderId,
      );
      if (paymentId === undefined) summary.lookupErrors += 1;
      else if (
        paymentId &&
        (await this.subscriptionsService.confirmInvoicePayment(
          invoice,
          paymentId,
        ))
      ) {
        summary.invoicesConfirmed += 1;
      }
    }

    summary.ordersAbandoned =
      await this.ordersRepo.markStaleRazorpayOrdersFailed(from);
    summary.invoicesAbandoned =
      await this.subscriptionsService.markStaleInvoicesFailed(from);
    return summary;
  }

  /** The captured payment id, null when none was captured, or undefined
   * when Razorpay couldn't be asked (logged; retried next run). */
  private async lookup(
    tenantId: string,
    razorpayOrderId: string,
  ): Promise<string | null | undefined> {
    try {
      return await this.razorpayClient.findCapturedPaymentId(
        tenantId,
        razorpayOrderId,
      );
    } catch (error) {
      this.logger.warn(
        `Payment check for Razorpay order ${razorpayOrderId} (tenant ${tenantId}) failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }
  }
}
