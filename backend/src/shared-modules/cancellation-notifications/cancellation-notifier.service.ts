import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../../database/prisma/prisma.service';
import { buildStorefrontOrigin } from '../../common/utils/storefront-url.util';
import { withTimeout } from '../../common/utils/with-timeout.util';
import { CancellationEmailKey } from '../mail/mail.service';
import { CancellationEmailJob } from '../queue/processors/mail.processor';
import { formatRupees, holdLineFor } from './cancellation-email.util';

const QUEUE_ENQUEUE_TIMEOUT_MS = 3000;

export interface CancellationTarget {
  kind: 'SUBSCRIPTION' | 'ORDER';
  id: string;
  /** Plan name or "Order ORD-…" — what the customer and owner recognise. */
  label: string;
}

export interface CancellationCustomer {
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
}

/**
 * Every email the cancellation-request flow sends. The owner alert goes
 * platform → business (to each OWNER and the order-notification inbox);
 * customer emails go from the tenant's own email. Sending never blocks or
 * fails the action itself — a queue hiccup is logged, the request stands.
 */
@Injectable()
export class CancellationNotifier {
  private readonly logger = new Logger(CancellationNotifier.name);

  constructor(
    @InjectQueue('mail') private readonly mailQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async notifyRequested(params: {
    tenantId: string;
    requestId: string;
    target: CancellationTarget;
    customer: CancellationCustomer;
    ownerEmails: string[];
    reasonLabel: string;
    note: string | null;
    heldFromDate: string | null;
    detailsHtml: string;
  }): Promise<void> {
    const { tenantId, target, customer } = params;
    const origin = await this.storefrontOrigin(tenantId);
    const path = target.kind === 'SUBSCRIPTION' ? 'subscriptions' : 'orders';
    const customerName = fullName(customer);
    const holdLine = holdLineFor(params.heldFromDate);
    const ownerData = {
      customerName,
      customerEmail: customer.email,
      customerPhone: customer.phone ?? 'No phone on file',
      requestKind: target.kind === 'SUBSCRIPTION' ? 'subscription' : 'order',
      requestKindTitle:
        target.kind === 'SUBSCRIPTION' ? 'Subscription' : 'Order',
      itemLabel: target.label,
      detailsHtml: params.detailsHtml,
      reasonLabel: params.reasonLabel,
      note: params.note ?? '—',
      holdLine,
      reviewUrl: `${origin}/admin/${path}/${target.id}`,
    };
    await Promise.all([
      ...params.ownerEmails.map((email) =>
        this.enqueue(
          tenantId,
          email,
          'cancellation-request-owner',
          ownerData,
          `${params.requestId}:owner:${email}`,
        ),
      ),
      this.enqueue(
        tenantId,
        customer.email,
        'cancellation-request-received',
        {
          customerName: customer.firstName,
          itemLabel: target.label,
          holdLine,
        },
        `${params.requestId}:received`,
      ),
    ]);
  }

  async notifyRejected(params: {
    tenantId: string;
    requestId: string;
    target: CancellationTarget;
    customer: CancellationCustomer;
    resolutionNote: string;
    bankedDays: number;
  }): Promise<void> {
    const resumeLine =
      params.target.kind === 'SUBSCRIPTION'
        ? params.bankedDays > 0
          ? `Your deliveries resume as usual, and the ${params.bankedDays} held ${params.bankedDays === 1 ? 'day has' : 'days have'} been added to the end of your plan.`
          : 'Your deliveries continue as usual.'
        : 'Your order goes ahead as planned.';
    await this.enqueue(
      params.tenantId,
      params.customer.email,
      'cancellation-request-rejected',
      {
        customerName: params.customer.firstName,
        itemLabel: params.target.label,
        resolutionNote: params.resolutionNote,
        resumeLine,
      },
      `${params.requestId}:rejected`,
    );
  }

  /** Called after an admin's Cancel & Refund closed a pending request. */
  async notifyApproved(params: {
    tenantId: string;
    userId: string;
    target: CancellationTarget;
    netRefundInPaise: number;
  }): Promise<void> {
    const customer = await this.prisma.user.findFirst({
      where: { id: params.userId, tenantId: params.tenantId },
      select: { firstName: true, email: true },
    });
    if (!customer) return;
    await this.enqueue(
      params.tenantId,
      customer.email,
      'cancellation-request-approved',
      {
        customerName: customer.firstName,
        itemLabel: params.target.label,
        refundAmount: formatRupees(params.netRefundInPaise),
      },
      `${params.target.id}:approved`,
    );
  }

  private async enqueue(
    tenantId: string,
    email: string,
    key: CancellationEmailKey,
    data: Record<string, string>,
    jobKey: string,
  ): Promise<void> {
    const job: CancellationEmailJob = { email, tenantId, key, data };
    try {
      await withTimeout(
        this.mailQueue.add('send-cancellation-email', job, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
          jobId: `send-cancellation-email:${jobKey}`,
        }),
        QUEUE_ENQUEUE_TIMEOUT_MS,
      );
    } catch (error) {
      this.logger.error(
        `Could not queue ${key} email for tenant ${tenantId}`,
        (error as Error).stack,
      );
    }
  }

  private async storefrontOrigin(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, customDomain: true },
    });
    return buildStorefrontOrigin(tenant ?? { slug: '', customDomain: null }, {
      platformRootDomain: this.config.get<string>('app.platformRootDomain'),
      frontendUrl: this.config.get<string>('app.frontendUrl')!,
    });
  }
}

function fullName(customer: CancellationCustomer): string {
  return [customer.firstName, customer.lastName].filter(Boolean).join(' ');
}
