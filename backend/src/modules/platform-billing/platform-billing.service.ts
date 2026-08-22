import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { createHash } from 'crypto';
import { Prisma } from '../../generated/prisma';
import { PlatformBillingRepository } from './platform-billing.repository';
import { PlatformRazorpayClientService } from '../../shared-modules/razorpay/platform-razorpay-client.service';
import { PlatformPlansRepository } from '../platform-plans/platform-plans.repository';
import { TenantLimitsService } from '../tenant-limits/tenant-limits.service';
import { CreateSubscriptionInviteDto } from './dto/create-subscription-invite.dto';
import { VerifyActivationDto } from './dto/verify-activation.dto';
import { SwitchPlanVerifyDto } from './dto/switch-plan-verify.dto';
import { CryptoUtil } from '../../common/utils/crypto.util';
import {
  PlatformActivationInviteEmailJob,
  PlatformInvoiceEmailJob,
  PlatformPaymentFailedEmailJob,
  PlatformWebhookFailedEmailJob,
} from '../../shared-modules/queue/processors/mail.processor';
import {
  BillingCycle,
  PlatformInvoiceStatus,
  PlatformSubscriptionStatus,
} from '../../generated/prisma';

const INVITE_TTL_DAYS = 7;

interface RazorpaySubscriptionWebhookPayload {
  event?: string;
  payload?: {
    subscription?: {
      entity?: {
        id?: string;
        current_end?: number;
      };
    };
    // Razorpay's real subscription webhook payload never carries a
    // top-level `invoice` entity — the invoice reference lives at
    // `payment.entity.invoice_id`, and its short_url needs a separate
    // invoices.fetch() call (see PlatformRazorpayClientService).
    payment?: {
      entity?: {
        id?: string;
        amount?: number;
        invoice_id?: string;
      };
    };
  };
}

@Injectable()
export class PlatformBillingService {
  private readonly logger = new Logger(PlatformBillingService.name);

  constructor(
    private readonly billingRepo: PlatformBillingRepository,
    private readonly razorpayClient: PlatformRazorpayClientService,
    private readonly plansRepo: PlatformPlansRepository,
    private readonly tenantLimits: TenantLimitsService,
    private readonly config: ConfigService,
    @InjectQueue('mail') private readonly mailQueue: Queue,
  ) {}

  /** Self-serve plan switch, step 1 of 2 (redesigned 2026-08-22 — see
   * schema.prisma's PlatformSubscription doc comment for why: Razorpay does
   * not reliably support an in-place plan_id update for any real payment
   * method). Creates the replacement Razorpay subscription and hands back
   * Checkout details — does not touch the DB yet, same discipline as
   * getInviteDetails(). An upgrade's replacement starts immediately; a
   * downgrade's replacement is authorized now but deferred (`start_at` =
   * current cycle's end) so it only starts billing once the current plan's
   * paid-for time is actually used up. */
  async switchPlan(
    tenantId: string,
    targetPlanId: string,
  ): Promise<{
    isUpgrade: boolean;
    razorpaySubscriptionId: string;
    razorpayKeyId: string;
    planCode: string;
    amountInPaise: number;
  }> {
    const [subscription, targetPlan] = await Promise.all([
      this.billingRepo.findSubscriptionWithPlanByTenantId(tenantId),
      this.plansRepo.findById(targetPlanId),
    ]);
    if (
      !subscription ||
      subscription.status !== PlatformSubscriptionStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Plan switching is only available once your current plan is active.',
      );
    }
    if (!subscription.razorpaySubscriptionId) {
      throw new BadRequestException(
        'This subscription has no active Razorpay mandate yet — contact support.',
      );
    }
    if (!targetPlan) throw new NotFoundException('Plan not found');
    if (targetPlan.id === subscription.planId) {
      throw new ConflictException('Already on this plan');
    }

    if (subscription.pendingRazorpaySubscriptionId) {
      await this.voidPendingReplacement(
        tenantId,
        subscription.pendingRazorpaySubscriptionId,
      );
    }

    const isUpgrade = targetPlan.priceInPaise > subscription.amountInPaise;

    const created = await this.razorpayClient.createPlanAndSubscription({
      planCode: targetPlan.name,
      billingCycle: targetPlan.billingCycle,
      amountInPaise: targetPlan.priceInPaise,
      startAt: isUpgrade
        ? undefined
        : (subscription.currentPeriodEnd ?? undefined),
    });

    return {
      isUpgrade,
      razorpaySubscriptionId: created.razorpaySubscriptionId,
      razorpayKeyId: this.razorpayClient.getKeyId(),
      planCode: targetPlan.name,
      amountInPaise: targetPlan.priceInPaise,
    };
  }

  /** Self-serve plan switch, step 2 of 2 — the tenant completed Checkout on
   * the replacement subscription from switchPlan(); verify the payment,
   * then either take over immediately (upgrade) or hand off at the current
   * cycle's end (downgrade, finalized later by processEvent's
   * subscription.cancelled handling). */
  async switchPlanVerify(
    tenantId: string,
    dto: SwitchPlanVerifyDto,
  ): Promise<{ scheduled: boolean }> {
    const [subscription, targetPlan] = await Promise.all([
      this.billingRepo.findSubscriptionWithPlanByTenantId(tenantId),
      this.plansRepo.findById(dto.planId),
    ]);
    if (!subscription || !subscription.razorpaySubscriptionId) {
      throw new BadRequestException('No active subscription to switch.');
    }
    if (!targetPlan) throw new NotFoundException('Plan not found');

    const valid = this.razorpayClient.verifySubscriptionPaymentSignature({
      razorpayPaymentId: dto.razorpayPaymentId,
      razorpaySubscriptionId: dto.razorpaySubscriptionId,
      razorpaySignature: dto.razorpaySignature,
    });
    if (!valid) {
      throw new BadRequestException('Payment verification failed');
    }

    const isUpgrade = targetPlan.priceInPaise > subscription.amountInPaise;
    const oldRazorpaySubscriptionId = subscription.razorpaySubscriptionId;

    if (isUpgrade) {
      await this.razorpayClient.cancelSubscriptionNow(
        oldRazorpaySubscriptionId,
      );
      await this.billingRepo.applyImmediatePlanChange(tenantId, {
        planId: targetPlan.id,
        planCode: targetPlan.name,
        amountInPaise: targetPlan.priceInPaise,
        billingCycle: targetPlan.billingCycle,
        razorpaySubscriptionId: dto.razorpaySubscriptionId,
      });
      await this.tenantLimits.resetForPlanChange(tenantId);
    } else {
      await this.razorpayClient.cancelAtCycleEnd(oldRazorpaySubscriptionId);
      await this.billingRepo.scheduleDowngrade(tenantId, {
        scheduledPlanId: targetPlan.id,
        scheduledPlanChangeAt: subscription.currentPeriodEnd,
        pendingRazorpaySubscriptionId: dto.razorpaySubscriptionId,
      });
    }

    return { scheduled: !isUpgrade };
  }

  /** Voids a not-yet-started replacement subscription and clears the local
   * pending fields — used when switching to a different target plan before
   * the first switch completes, or on a full cancel while a downgrade is
   * mid-flight. Deliberately does NOT touch the current subscription's own
   * scheduled cancellation: Razorpay has no API to undo a `cancel_at_cycle_
   * end` cancellation once submitted (confirmed live and against their docs
   * — "Cancel an Update" only reverses a scheduled *plan* change, never a
   * scheduled cancellation, and "Once cancelled, you cannot renew or
   * reactivate it" applies regardless of immediate or at-cycle-end). A
   * self-serve "cancel my scheduled downgrade, stay on my current plan"
   * action is therefore not offered — once confirmed, a downgrade switch
   * is final; the UI warns of this before the tenant confirms. */
  private async voidPendingReplacement(
    tenantId: string,
    pendingRazorpaySubscriptionId: string,
  ): Promise<void> {
    await this.razorpayClient.cancelSubscriptionNow(
      pendingRazorpaySubscriptionId,
    );
    await this.billingRepo.unwindPendingPlanChange(tenantId);
  }

  async createInvite(
    tenantId: string,
    dto: CreateSubscriptionInviteDto,
    createdByUserId: string,
  ): Promise<{ activationUrl: string }> {
    const tenant = await this.billingRepo.findTenantBasics(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Picking a catalog plan derives the billing shape from it — anything
    // else in the body is ignored so the invite always matches what's
    // actually in the PlatformPlan catalog, not a stale/mistyped copy of it.
    // planId is explicitly null (not undefined) in the manual branch so a
    // re-invite that switches from a catalog plan to a one-off deal clears
    // the old link instead of Prisma silently leaving it untouched.
    let planId: string | null;
    let planCode: string;
    let billingCycle: BillingCycle;
    let amountInPaise: number;
    if (dto.planId) {
      const plan = await this.plansRepo.findById(dto.planId);
      if (!plan) throw new NotFoundException('Platform plan not found');
      planId = plan.id;
      planCode = plan.name;
      billingCycle = plan.billingCycle;
      amountInPaise = plan.priceInPaise;
    } else {
      if (!dto.planCode || !dto.billingCycle || dto.amountInPaise === undefined) {
        throw new BadRequestException(
          'Provide either planId or planCode/billingCycle/amountInPaise',
        );
      }
      planId = null;
      planCode = dto.planCode;
      billingCycle = dto.billingCycle;
      amountInPaise = dto.amountInPaise;
    }

    const token = CryptoUtil.generateToken(32);
    const expiresAt = new Date(
      Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.billingRepo.createSubscriptionAndInvite({
      tenantId,
      planId,
      planCode,
      billingCycle,
      amountInPaise,
      token,
      expiresAt,
      createdByUserId,
    });

    const activationUrl = `${this.config.get<string>('app.frontendUrl')}/platform/activate/${token}`;

    const owner = await this.billingRepo.findOwnerEmail(tenantId);
    if (owner) {
      const job: PlatformActivationInviteEmailJob = {
        email: owner.email,
        businessName: tenant.name,
        activationUrl,
        planCode,
        amountInPaise,
        billingCycle,
      };
      try {
        await this.mailQueue.add('send-platform-activation-invite', job, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
          jobId: `send-platform-activation-invite:${tenantId}:${token}`,
        });
      } catch (error) {
        // The activation link is still shown/copyable in the admin UI even
        // if the email fails to send — don't fail invite creation over it.
        this.logger.warn(
          `Could not enqueue activation-invite email for tenant ${tenantId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return { activationUrl };
  }

  async getInviteDetails(token: string) {
    const invite = await this.assertValidInvite(token);
    const tenant = await this.billingRepo.findTenantBasics(invite.tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found');

    let razorpaySubscriptionId = invite.razorpaySubscriptionId;
    if (!razorpaySubscriptionId) {
      const created = await this.razorpayClient.createPlanAndSubscription({
        planCode: invite.planCode,
        billingCycle: invite.billingCycle,
        amountInPaise: invite.amountInPaise,
      });
      await this.billingRepo.updateInviteRazorpaySubscription(
        invite.id,
        created.razorpaySubscriptionId,
      );
      razorpaySubscriptionId = created.razorpaySubscriptionId;
    }

    return {
      businessName: tenant.name,
      planCode: invite.planCode,
      billingCycle: invite.billingCycle,
      amountInPaise: invite.amountInPaise,
      razorpaySubscriptionId,
      razorpayKeyId: this.razorpayClient.getKeyId(),
    };
  }

  async verifyAndActivate(
    token: string,
    dto: VerifyActivationDto,
  ): Promise<{ activated: true }> {
    const invite = await this.billingRepo.findInviteByToken(token);
    if (!invite) throw new NotFoundException('Invalid activation link');

    // Idempotent: a page refresh/duplicate submit after a successful verify
    // shouldn't error — it's already done.
    if (invite.usedAt) return { activated: true };

    if (invite.expiresAt < new Date()) {
      throw new GoneException('This activation link has expired');
    }
    if (invite.razorpaySubscriptionId !== dto.razorpaySubscriptionId) {
      throw new BadRequestException('Subscription mismatch');
    }

    const valid = this.razorpayClient.verifySubscriptionPaymentSignature(dto);
    if (!valid) {
      throw new BadRequestException('Payment verification failed');
    }

    const fetched = await this.razorpayClient.fetchSubscription(
      dto.razorpaySubscriptionId,
    );

    await this.billingRepo.activateFromInvite({
      tenantId: invite.tenantId,
      inviteId: invite.id,
      razorpaySubscriptionId: dto.razorpaySubscriptionId,
      razorpayCustomerId: fetched.customerId,
      currentPeriodEnd: fetched.currentEnd
        ? new Date(fetched.currentEnd * 1000)
        : null,
    });
    // A reactivation (not just a brand-new tenant) may carry stale
    // TenantLimits — blocked-attempt counters, alert-dedupe flags, or a
    // manual override from before a prior cancellation/suspension. Reset
    // on every activation, same as the other two paths that change a
    // tenant's effective plan (switchPlan's immediate upgrade, and the
    // scheduled-downgrade webhook finalization).
    await this.tenantLimits.resetForPlanChange(invite.tenantId);

    return { activated: true };
  }

  async manualActivate(tenantId: string): Promise<void> {
    const tenant = await this.billingRepo.findTenantBasics(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found');
    await this.billingRepo.manualActivate(tenantId);
    await this.tenantLimits.resetForPlanChange(tenantId);
  }

  listInvoices(tenantId: string) {
    return this.billingRepo.findInvoicesByTenantId(tenantId);
  }

  /** Final the moment it's confirmed — Razorpay has no API to undo a
   * `cancel_at_cycle_end` cancellation once submitted (see
   * voidPendingReplacement's doc comment), so there is deliberately no
   * resume action; the admin UI warns of this before SUPER_ADMIN confirms. */
  async scheduleCancellation(tenantId: string): Promise<void> {
    const subscription =
      await this.billingRepo.findSubscriptionByTenantId(tenantId);
    if (!subscription) throw new NotFoundException('No subscription found');
    if (!subscription.razorpaySubscriptionId) {
      throw new BadRequestException(
        'This subscription has no Razorpay subscription attached yet — nothing to cancel.',
      );
    }
    if (subscription.cancelAtPeriodEnd) {
      throw new ConflictException('Cancellation is already scheduled');
    }

    if (subscription.pendingRazorpaySubscriptionId) {
      await this.voidPendingReplacement(
        tenantId,
        subscription.pendingRazorpaySubscriptionId,
      );
    }

    await this.razorpayClient.cancelAtCycleEnd(
      subscription.razorpaySubscriptionId,
    );
    await this.billingRepo.setCancelAtPeriodEnd(tenantId, true);
  }

  async handleWebhook(
    rawBody: Buffer,
    signature: string | undefined,
    eventIdHeader: string | undefined,
  ): Promise<void> {
    if (!signature) throw new BadRequestException('Missing webhook signature');

    const valid = this.razorpayClient.verifyWebhookSignature(
      rawBody,
      signature,
    );
    if (!valid) throw new BadRequestException('Invalid webhook signature');

    let payload: RazorpaySubscriptionWebhookPayload;
    try {
      payload = JSON.parse(
        rawBody.toString('utf8'),
      ) as RazorpaySubscriptionWebhookPayload;
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    // Razorpay's own recommended dedup key (unique per event, per their
    // docs) — but never trust a header is always present. The fallback is
    // a hash of the raw body, not `${subscriptionId}:${event}` — a
    // per-type key would collide across two genuinely different charges of
    // the *same* event type on the *same* subscription (e.g. two real
    // `subscription.charged` events, one per billing cycle), silently
    // dropping the second one as a "duplicate" it isn't. A content hash
    // still dedupes a true retried-redelivery of the same payload
    // correctly, without that collision.
    const eventId =
      eventIdHeader ?? createHash('sha256').update(rawBody).digest('hex');

    const existing = await this.billingRepo.findWebhookEvent(eventId);
    if (existing?.status === 'PROCESSED') return;

    // Recorded here — before we even look at whether we recognize the
    // payload's shape — so "did we receive event X" is always answerable
    // from this table for every webhook that passes signature
    // verification, not just the ones we happened to act on.
    let record = existing;
    if (!record) {
      try {
        record = await this.billingRepo.createWebhookEvent(
          eventId,
          payload.event ?? 'unknown',
          payload as unknown as Prisma.InputJsonValue,
        );
      } catch (error) {
        // Two concurrent deliveries of the same event both raced past the
        // findWebhookEvent check above — the loser hits the eventId unique
        // constraint. That's not a real failure, it means the winner is
        // already (or about to be) handling this exact event; just adopt
        // its row instead of erroring the whole request.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          record = await this.billingRepo.findWebhookEvent(eventId);
        }
        if (!record) throw error;
      }
    }

    const subscriptionId = payload.payload?.subscription?.entity?.id;
    if (!subscriptionId) {
      // A real subscription.* event always includes this per Razorpay's
      // own payload docs — reaching here means either a non-subscription
      // event landed on this endpoint, or a malformed/test request.
      // Already recorded above; nothing to act on.
      await this.billingRepo.markWebhookProcessed(record.id);
      return;
    }

    try {
      await this.processEvent(payload, subscriptionId);
      await this.billingRepo.markWebhookProcessed(record.id);
    } catch (error) {
      const errorMessage = (error as Error).message;
      await this.billingRepo.markWebhookFailed(record.id, errorMessage);
      // Razorpay retries automatically for ~24h — a single transient
      // failure (a momentary DB blip, a network hiccup) usually self-heals
      // on the next redelivery and isn't worth paging over. Only alert
      // once this exact event has already failed at least once *before*
      // this attempt too — that's the "this isn't going to fix itself"
      // signal. Nothing else in this codebase currently notifies Arpit
      // that a webhook is stuck, so this was previously a silent gap for
      // a billing system.
      if (existing?.status === 'FAILED') {
        const alertEmail = this.config.get<string>('platformBilling.alertEmail');
        if (alertEmail) {
          await this.enqueueWebhookFailedEmail({
            email: alertEmail,
            eventType: payload.event ?? 'unknown',
            eventId,
            errorMessage,
          });
        }
      }
      throw error;
    }
  }

  private async processEvent(
    payload: RazorpaySubscriptionWebhookPayload,
    razorpaySubscriptionId: string,
  ): Promise<void> {
    const subscription = await this.billingRepo.findSubscriptionByRazorpayId(
      razorpaySubscriptionId,
    );
    if (!subscription) {
      this.logger.warn(
        `Webhook for unknown platform subscription ${razorpaySubscriptionId}`,
      );
      return;
    }

    const tenant = await this.billingRepo.findTenantBasics(
      subscription.tenantId,
    );
    if (!tenant) return;

    const paymentEntity = payload.payload?.payment?.entity;
    const subscriptionEntity = payload.payload?.subscription?.entity;

    if (payload.event === 'subscription.charged') {
      // The webhook payload only ever carries the invoice *id*
      // (payment.entity.invoice_id) — the short_url needs its own
      // Razorpay call. Best-effort: a failed lookup returns null rather
      // than failing the whole webhook, so a missing link never turns a
      // real charge into a retried/duplicated event.
      const invoiceUrl = paymentEntity?.invoice_id
        ? await this.razorpayClient.fetchInvoiceUrl(paymentEntity.invoice_id)
        : null;

      await this.billingRepo.createInvoice({
        tenantId: subscription.tenantId,
        platformSubscriptionId: subscription.id,
        razorpayInvoiceId: paymentEntity?.invoice_id ?? null,
        razorpayPaymentId: paymentEntity?.id ?? null,
        amountInPaise: paymentEntity?.amount ?? subscription.amountInPaise,
        status: PlatformInvoiceStatus.PAID,
        invoiceUrl,
        periodStart: null,
        periodEnd: subscriptionEntity?.current_end
          ? new Date(subscriptionEntity.current_end * 1000)
          : null,
      });
      await this.billingRepo.updateSubscriptionPeriod(
        subscription.tenantId,
        subscriptionEntity?.current_end
          ? new Date(subscriptionEntity.current_end * 1000)
          : subscription.currentPeriodEnd,
      );

      const owner = await this.billingRepo.findOwnerEmail(
        subscription.tenantId,
      );
      if (owner) {
        await this.enqueueInvoiceEmail({
          email: owner.email,
          businessName: tenant.name,
          amountInPaise: paymentEntity?.amount ?? subscription.amountInPaise,
          invoiceUrl,
        });
      }
    } else if (payload.event === 'subscription.pending') {
      await this.billingRepo.createInvoice({
        tenantId: subscription.tenantId,
        platformSubscriptionId: subscription.id,
        razorpayInvoiceId: paymentEntity?.invoice_id ?? null,
        razorpayPaymentId: paymentEntity?.id ?? null,
        amountInPaise: paymentEntity?.amount ?? subscription.amountInPaise,
        status: PlatformInvoiceStatus.FAILED,
        invoiceUrl: null,
        periodStart: null,
        periodEnd: null,
      });

      const amountInPaise = paymentEntity?.amount ?? subscription.amountInPaise;
      const owner = await this.billingRepo.findOwnerEmail(
        subscription.tenantId,
      );
      if (owner) {
        await this.enqueuePaymentFailedEmail({
          email: owner.email,
          businessName: tenant.name,
          amountInPaise,
          isOwnerRecipient: true,
        });
      }
      const alertEmail = this.config.get<string>('platformBilling.alertEmail');
      if (alertEmail) {
        await this.enqueuePaymentFailedEmail({
          email: alertEmail,
          businessName: tenant.name,
          amountInPaise,
          isOwnerRecipient: false,
        });
      }
    } else if (payload.event === 'subscription.activated') {
      // Reconciliation, not the primary activation path — verifyAndActivate()
      // already flips status inline off the payment-verify call, before any
      // webhook can arrive. This only matters if that synchronous write
      // somehow didn't land; reconcileActivated() is itself a no-op unless
      // the subscription is still sitting at PENDING_PAYMENT.
      await this.billingRepo.reconcileActivated(subscription.tenantId);
    } else if (payload.event === 'subscription.halted') {
      await this.billingRepo.haltSubscriptionAndSuspendTenant(
        subscription.tenantId,
      );
    } else if (payload.event === 'subscription.completed') {
      await this.billingRepo.markCompleted(subscription.tenantId);
    } else if (payload.event === 'subscription.cancelled') {
      // Either the scheduled cancel-at-cycle-end (see scheduleCancellation)
      // taking effect — Razorpay stops billing rights and moves the
      // subscription to its terminal cancelled state — or a scheduled
      // downgrade's OLD subscription reaching its cycle-end exactly where
      // scheduled, handing off to the already-authorized replacement (see
      // markCancelled's own doc comment for the full distinction).
      const { downgradeHandoff } = await this.billingRepo.markCancelled(
        subscription.tenantId,
      );
      if (downgradeHandoff) {
        await this.tenantLimits.resetForPlanChange(subscription.tenantId);
      }
    } else if (
      payload.event === 'subscription.paused' ||
      payload.event === 'subscription.resumed'
    ) {
      // PlatformSubscription never exposes a pause action anywhere in this
      // app (only cancel) — nothing here ever calls Razorpay's
      // subscriptions.pause()/.resume(). Seeing one of these means it
      // happened directly on the Razorpay dashboard, out of band. Logged
      // rather than silently dropped so it's visible, but deliberately not
      // auto-acted on — a manual dashboard action needs a human to decide
      // whether Tenant.status should follow it.
      this.logger.warn(
        `Received ${payload.event} for tenant ${subscription.tenantId} — this app never triggers a pause/resume itself, so this happened directly on the Razorpay dashboard. No status change applied automatically.`,
      );
    } else {
      // subscription.authenticated / subscription.updated / anything future
      // — routine events with no local state for us to reconcile. Logged at
      // debug rather than silently falling through, so a genuinely new
      // event type is still visible if Razorpay adds one.
      this.logger.debug(
        `Unhandled webhook event ${payload.event ?? '(none)'} for tenant ${subscription.tenantId} — no action needed.`,
      );
    }
  }

  private async enqueueInvoiceEmail(
    job: PlatformInvoiceEmailJob,
  ): Promise<void> {
    await this.mailQueue.add('send-platform-invoice', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  private async enqueuePaymentFailedEmail(
    job: PlatformPaymentFailedEmailJob,
  ): Promise<void> {
    await this.mailQueue.add('send-platform-payment-failed', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  private async enqueueWebhookFailedEmail(
    job: PlatformWebhookFailedEmailJob,
  ): Promise<void> {
    // Deliberately no jobId dedup here (unlike the activation-invite
    // email) — a distinct alert per failed attempt is fine; Bull's own
    // attempts/backoff already bounds it, and this only fires from the
    // 2nd+ failure onward per the caller's own guard.
    await this.mailQueue.add('send-platform-webhook-failed', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  private async assertValidInvite(token: string) {
    const invite = await this.billingRepo.findInviteByToken(token);
    if (!invite) throw new NotFoundException('Invalid activation link');
    if (invite.usedAt) {
      throw new ConflictException('This activation link has already been used');
    }
    if (invite.expiresAt < new Date()) {
      throw new GoneException('This activation link has expired');
    }
    return invite;
  }
}
