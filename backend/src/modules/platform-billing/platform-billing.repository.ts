import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  BillingCycle,
  PlatformInvoice,
  PlatformInvoiceStatus,
  PlatformSubscription,
  PlatformSubscriptionStatus,
  RazorpayWebhookEvent,
  Role,
  Status,
  TenantActivationInvite,
} from '../../generated/prisma';

@Injectable()
export class PlatformBillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findTenantBasics(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, status: true },
    });
  }

  findOwnerEmail(tenantId: string): Promise<{ email: string } | null> {
    return this.prisma.user.findFirst({
      where: { tenantId, role: Role.OWNER },
      select: { email: true },
    });
  }

  findSubscriptionByTenantId(
    tenantId: string,
  ): Promise<PlatformSubscription | null> {
    return this.prisma.platformSubscription.findUnique({
      where: { tenantId },
    });
  }

  findSubscriptionByRazorpayId(
    razorpaySubscriptionId: string,
  ): Promise<PlatformSubscription | null> {
    return this.prisma.platformSubscription.findFirst({
      where: { razorpaySubscriptionId },
    });
  }

  findSubscriptionWithPlanByTenantId(tenantId: string) {
    return this.prisma.platformSubscription.findUnique({
      where: { tenantId },
      include: { plan: true, scheduledPlan: true },
    });
  }

  /** An upgrade — applied immediately, the new plan's fields become current right away, clearing any stale scheduled downgrade from a prior switch. */
  applyImmediatePlanChange(
    tenantId: string,
    params: {
      planId: string;
      planCode: string;
      amountInPaise: number;
      billingCycle: BillingCycle;
    },
  ): Promise<PlatformSubscription> {
    return this.prisma.platformSubscription.update({
      where: { tenantId },
      data: {
        planId: params.planId,
        planCode: params.planCode,
        amountInPaise: params.amountInPaise,
        billingCycle: params.billingCycle,
        scheduledPlanId: null,
        scheduledPlanChangeAt: null,
      },
    });
  }

  /** A downgrade — recorded but not applied; TenantLimits/plan fields stay on the current (higher) plan until the next `subscription.charged` webhook confirms the new cycle actually started (see finalizeScheduledPlanChange). */
  scheduleDowngrade(
    tenantId: string,
    params: { scheduledPlanId: string; scheduledPlanChangeAt: Date | null },
  ): Promise<PlatformSubscription> {
    return this.prisma.platformSubscription.update({
      where: { tenantId },
      data: {
        scheduledPlanId: params.scheduledPlanId,
        scheduledPlanChangeAt: params.scheduledPlanChangeAt,
      },
    });
  }

  finalizeScheduledPlanChange(
    tenantId: string,
    params: {
      planId: string;
      planCode: string;
      amountInPaise: number;
      billingCycle: BillingCycle;
    },
  ): Promise<PlatformSubscription> {
    return this.prisma.platformSubscription.update({
      where: { tenantId },
      data: {
        planId: params.planId,
        planCode: params.planCode,
        amountInPaise: params.amountInPaise,
        billingCycle: params.billingCycle,
        scheduledPlanId: null,
        scheduledPlanChangeAt: null,
      },
    });
  }

  async createSubscriptionAndInvite(params: {
    tenantId: string;
    planCode: string;
    billingCycle: BillingCycle;
    amountInPaise: number;
    token: string;
    expiresAt: Date;
    createdByUserId: string;
  }): Promise<{
    subscription: PlatformSubscription;
    invite: TenantActivationInvite;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.platformSubscription.upsert({
        where: { tenantId: params.tenantId },
        update: {
          planCode: params.planCode,
          billingCycle: params.billingCycle,
          amountInPaise: params.amountInPaise,
          status: PlatformSubscriptionStatus.PENDING_PAYMENT,
        },
        create: {
          tenantId: params.tenantId,
          planCode: params.planCode,
          billingCycle: params.billingCycle,
          amountInPaise: params.amountInPaise,
        },
      });

      const invite = await tx.tenantActivationInvite.create({
        data: {
          tenantId: params.tenantId,
          token: params.token,
          planCode: params.planCode,
          billingCycle: params.billingCycle,
          amountInPaise: params.amountInPaise,
          expiresAt: params.expiresAt,
          createdByUserId: params.createdByUserId,
        },
      });

      return { subscription, invite };
    });
  }

  findInviteByToken(token: string): Promise<TenantActivationInvite | null> {
    return this.prisma.tenantActivationInvite.findUnique({ where: { token } });
  }

  updateInviteRazorpaySubscription(
    id: string,
    razorpaySubscriptionId: string,
  ): Promise<TenantActivationInvite> {
    return this.prisma.tenantActivationInvite.update({
      where: { id },
      data: { razorpaySubscriptionId },
    });
  }

  async activateFromInvite(params: {
    tenantId: string;
    inviteId: string;
    razorpaySubscriptionId: string;
    razorpayCustomerId: string | null;
    currentPeriodEnd: Date | null;
  }): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.platformSubscription.update({
        where: { tenantId: params.tenantId },
        data: {
          status: PlatformSubscriptionStatus.ACTIVE,
          razorpaySubscriptionId: params.razorpaySubscriptionId,
          razorpayCustomerId: params.razorpayCustomerId,
          currentPeriodEnd: params.currentPeriodEnd,
        },
      }),
      this.prisma.tenant.update({
        where: { id: params.tenantId },
        data: { status: Status.ACTIVE },
      }),
      this.prisma.tenantActivationInvite.update({
        where: { id: params.inviteId },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  /** SUPER_ADMIN's direct override — comped/offline-paid/test tenants, no invite or payment involved. */
  async manualActivate(tenantId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: { status: Status.ACTIVE },
      });

      const subscription = await tx.platformSubscription.findUnique({
        where: { tenantId },
      });
      if (
        subscription &&
        subscription.status === PlatformSubscriptionStatus.PENDING_PAYMENT
      ) {
        await tx.platformSubscription.update({
          where: { tenantId },
          data: { status: PlatformSubscriptionStatus.ACTIVE },
        });
      }
    });
  }

  setCancelAtPeriodEnd(
    tenantId: string,
    cancelAtPeriodEnd: boolean,
  ): Promise<PlatformSubscription> {
    return this.prisma.platformSubscription.update({
      where: { tenantId },
      data: { cancelAtPeriodEnd },
    });
  }

  /** The scheduled cancellation actually taking effect, at period end (subscription.cancelled webhook). */
  async markCancelled(tenantId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.platformSubscription.update({
        where: { tenantId },
        data: {
          status: PlatformSubscriptionStatus.CANCELLED,
          cancelAtPeriodEnd: false,
        },
      }),
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { status: Status.INACTIVE },
      }),
    ]);
  }

  updateSubscriptionPeriod(
    tenantId: string,
    currentPeriodEnd: Date | null,
  ): Promise<PlatformSubscription> {
    return this.prisma.platformSubscription.update({
      where: { tenantId },
      data: { currentPeriodEnd },
    });
  }

  async haltSubscriptionAndSuspendTenant(tenantId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.platformSubscription.update({
        where: { tenantId },
        data: { status: PlatformSubscriptionStatus.PAST_DUE },
      }),
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { status: Status.SUSPENDED },
      }),
    ]);
  }

  createInvoice(data: {
    tenantId: string;
    platformSubscriptionId: string;
    razorpayInvoiceId: string | null;
    razorpayPaymentId: string | null;
    amountInPaise: number;
    status: PlatformInvoiceStatus;
    invoiceUrl: string | null;
    periodStart: Date | null;
    periodEnd: Date | null;
  }): Promise<PlatformInvoice> {
    return this.prisma.platformInvoice.create({ data });
  }

  findInvoicesByTenantId(tenantId: string): Promise<PlatformInvoice[]> {
    return this.prisma.platformInvoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Webhook idempotency (shared RazorpayWebhookEvent table — global, not
  // tenant/feature-scoped; the `payments` module has its own instance of the
  // same repository shape for tenant-order webhooks) ──

  findWebhookEvent(eventId: string): Promise<RazorpayWebhookEvent | null> {
    return this.prisma.razorpayWebhookEvent.findUnique({ where: { eventId } });
  }

  createWebhookEvent(
    eventId: string,
    eventType: string,
  ): Promise<RazorpayWebhookEvent> {
    return this.prisma.razorpayWebhookEvent.create({
      data: { eventId, eventType, status: 'PENDING' },
    });
  }

  markWebhookProcessed(id: string): Promise<RazorpayWebhookEvent> {
    return this.prisma.razorpayWebhookEvent.update({
      where: { id },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });
  }

  markWebhookFailed(
    id: string,
    errorMessage: string,
  ): Promise<RazorpayWebhookEvent> {
    return this.prisma.razorpayWebhookEvent.update({
      where: { id },
      data: { status: 'FAILED', errorMessage },
    });
  }
}
