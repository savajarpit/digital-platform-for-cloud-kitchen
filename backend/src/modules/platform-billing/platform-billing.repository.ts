import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  BillingCycle,
  PlatformInvoice,
  PlatformInvoiceStatus,
  PlatformSubscription,
  PlatformSubscriptionStatus,
  Prisma,
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

  /** A webhook may arrive for either the primary subscription or a not-yet-
   * primary one authorized for a scheduled downgrade (e.g. `subscription.
   * authenticated` right after the tenant completes its deferred-start
   * Checkout) — check both fields, not just the primary one. */
  findSubscriptionByRazorpayId(
    razorpaySubscriptionId: string,
  ): Promise<PlatformSubscription | null> {
    return this.prisma.platformSubscription.findFirst({
      where: {
        OR: [
          { razorpaySubscriptionId },
          { pendingRazorpaySubscriptionId: razorpaySubscriptionId },
        ],
      },
    });
  }

  findSubscriptionWithPlanByTenantId(tenantId: string) {
    return this.prisma.platformSubscription.findUnique({
      where: { tenantId },
      include: { plan: true, scheduledPlan: true },
    });
  }

  /** An upgrade's replacement subscription, verified — becomes current right
   * away (the OLD Razorpay subscription is cancelled by the caller before
   * this runs), clearing any stale scheduled downgrade from a prior switch. */
  applyImmediatePlanChange(
    tenantId: string,
    params: {
      planId: string;
      planCode: string;
      amountInPaise: number;
      billingCycle: BillingCycle;
      razorpaySubscriptionId: string;
    },
  ): Promise<PlatformSubscription> {
    return this.prisma.platformSubscription.update({
      where: { tenantId },
      data: {
        planId: params.planId,
        planCode: params.planCode,
        amountInPaise: params.amountInPaise,
        billingCycle: params.billingCycle,
        razorpaySubscriptionId: params.razorpaySubscriptionId,
        scheduledPlanId: null,
        scheduledPlanChangeAt: null,
        pendingRazorpaySubscriptionId: null,
      },
    });
  }

  /** A downgrade's replacement subscription, verified but deferred — the
   * OLD subscription keeps billing (its cancellation is scheduled by the
   * caller for the same cycle-end); TenantLimits/plan fields stay on the
   * current (higher) plan until the OLD subscription's `subscription.
   * cancelled` webhook confirms its cycle actually ended (see
   * PlatformBillingService.processEvent's markCancelled handling). */
  scheduleDowngrade(
    tenantId: string,
    params: {
      scheduledPlanId: string;
      scheduledPlanChangeAt: Date | null;
      pendingRazorpaySubscriptionId: string;
    },
  ): Promise<PlatformSubscription> {
    return this.prisma.platformSubscription.update({
      where: { tenantId },
      data: {
        scheduledPlanId: params.scheduledPlanId,
        scheduledPlanChangeAt: params.scheduledPlanChangeAt,
        pendingRazorpaySubscriptionId: params.pendingRazorpaySubscriptionId,
      },
    });
  }

  /** The scheduled downgrade's replacement subscription taking over as
   * primary, once the OLD one's cycle actually ended (see markCancelled). */
  finalizeScheduledPlanChange(
    tenantId: string,
    params: {
      planId: string;
      planCode: string;
      amountInPaise: number;
      billingCycle: BillingCycle;
      razorpaySubscriptionId: string;
    },
  ): Promise<PlatformSubscription> {
    return this.prisma.platformSubscription.update({
      where: { tenantId },
      data: {
        planId: params.planId,
        planCode: params.planCode,
        amountInPaise: params.amountInPaise,
        billingCycle: params.billingCycle,
        razorpaySubscriptionId: params.razorpaySubscriptionId,
        scheduledPlanId: null,
        scheduledPlanChangeAt: null,
        pendingRazorpaySubscriptionId: null,
      },
    });
  }

  /** Clears a pending scheduled switch without touching the current plan —
   * the Razorpay-side unwind (voiding the pending subscription, undoing the
   * current one's scheduled cancel-at-cycle-end) happens in the service
   * layer before this runs. */
  unwindPendingPlanChange(tenantId: string): Promise<PlatformSubscription> {
    return this.prisma.platformSubscription.update({
      where: { tenantId },
      data: {
        scheduledPlanId: null,
        scheduledPlanChangeAt: null,
        pendingRazorpaySubscriptionId: null,
      },
    });
  }

  async createSubscriptionAndInvite(params: {
    tenantId: string;
    planId?: string | null;
    planCode: string;
    billingCycle: BillingCycle;
    amountInPaise: number;
    token: string;
    expiresAt: Date;
    trialEndsAt: Date | null;
    createdByUserId: string;
  }): Promise<{
    subscription: PlatformSubscription;
    invite: TenantActivationInvite;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.platformSubscription.upsert({
        where: { tenantId: params.tenantId },
        update: {
          planId: params.planId,
          planCode: params.planCode,
          billingCycle: params.billingCycle,
          amountInPaise: params.amountInPaise,
          status: PlatformSubscriptionStatus.PENDING_PAYMENT,
          // Cleared here, not set — a re-invite's trial only becomes real
          // once activateFromInvite() runs; showing "on trial" before the
          // tenant has even completed activation would be misleading.
          trialEndsAt: null,
        },
        create: {
          tenantId: params.tenantId,
          planId: params.planId,
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
          trialEndsAt: params.trialEndsAt,
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
    trialEndsAt: Date | null;
  }): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.platformSubscription.update({
        where: { tenantId: params.tenantId },
        data: {
          status: PlatformSubscriptionStatus.ACTIVE,
          razorpaySubscriptionId: params.razorpaySubscriptionId,
          razorpayCustomerId: params.razorpayCustomerId,
          currentPeriodEnd: params.currentPeriodEnd,
          trialEndsAt: params.trialEndsAt,
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

  /** `subscription.cancelled` on the primary subscription — two different
   * real meanings, distinguished by whether a scheduled-downgrade handoff
   * is in flight:
   * - A pending replacement exists (`pendingRazorpaySubscriptionId` set):
   *   this cancellation is the OLD subscription's cycle ending exactly
   *   where scheduled to line up with the new one — the downgrade taking
   *   effect, not a real cancellation. Swap the replacement in as primary,
   *   apply its plan, keep the tenant ACTIVE.
   * - Nothing pending: a real cancellation (SUPER_ADMIN's `scheduleCancellation`
   *   reaching its cycle-end) — today's terminal-state behavior.
   */
  async markCancelled(tenantId: string): Promise<{ downgradeHandoff: boolean }> {
    const subscription = await this.prisma.platformSubscription.findUnique({
      where: { tenantId },
      include: { scheduledPlan: true },
    });

    if (subscription?.pendingRazorpaySubscriptionId && subscription.scheduledPlan) {
      const target = subscription.scheduledPlan;
      await this.finalizeScheduledPlanChange(tenantId, {
        planId: target.id,
        planCode: target.name,
        amountInPaise: target.priceInPaise,
        billingCycle: target.billingCycle,
        razorpaySubscriptionId: subscription.pendingRazorpaySubscriptionId,
      });
      return { downgradeHandoff: true };
    }

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
    return { downgradeHandoff: false };
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

  /** Reconciliation for `subscription.activated` — the webhook confirming
   * what the synchronous verifyAndActivate() call already did inline. Only
   * flips PENDING_PAYMENT → ACTIVE; deliberately a no-op for any other
   * current status (PAST_DUE/CANCELLED/already-ACTIVE) so a stray/late
   * webhook can never resurrect a subscription that moved on for a real
   * reason since. */
  async reconcileActivated(tenantId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.platformSubscription.findUnique({
        where: { tenantId },
      });
      if (subscription?.status !== PlatformSubscriptionStatus.PENDING_PAYMENT) {
        return;
      }
      await tx.platformSubscription.update({
        where: { tenantId },
        data: { status: PlatformSubscriptionStatus.ACTIVE },
      });
      await tx.tenant.update({
        where: { id: tenantId },
        data: { status: Status.ACTIVE },
      });
    });
  }

  /** `subscription.completed` — every scheduled billing cycle finished
   * (Razorpay's total_count exhausted). No distinct DB status for this
   * (practically unreachable — total_count is set to ~10 years' worth of
   * cycles, see PlatformRazorpayClientService), so it's treated the same
   * as a cancellation: no more billing rights either way, and a fresh
   * subscription can be created if this is ever genuinely hit. */
  async markCompleted(tenantId: string): Promise<void> {
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

  /** Idempotent on razorpayPaymentId when present — a webhook retry after a
   * partial local failure (invoice written, a later step in the same
   * handler throws) must not produce a second invoice row + a second
   * invoice/payment-failed email for the exact same real charge attempt.
   * Falls back to a plain create when there's no payment id to key on
   * (e.g. a `subscription.pending` event with no payment attempt made
   * yet) — that shape doesn't have a stable identifier to dedupe on. */
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
    if (!data.razorpayPaymentId) {
      return this.prisma.platformInvoice.create({ data });
    }
    return this.prisma.platformInvoice.upsert({
      where: { razorpayPaymentId: data.razorpayPaymentId },
      update: data,
      create: data,
    });
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
    payload: Prisma.InputJsonValue,
  ): Promise<RazorpayWebhookEvent> {
    return this.prisma.razorpayWebhookEvent.create({
      data: { eventId, eventType, payload, status: 'PENDING' },
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
