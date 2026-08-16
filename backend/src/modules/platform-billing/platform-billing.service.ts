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
import { PlatformBillingRepository } from './platform-billing.repository';
import { PlatformRazorpayClientService } from '../../shared-modules/razorpay/platform-razorpay-client.service';
import { PlatformPlansRepository } from '../platform-plans/platform-plans.repository';
import { TenantLimitsService } from '../tenant-limits/tenant-limits.service';
import { CreateSubscriptionInviteDto } from './dto/create-subscription-invite.dto';
import { VerifyActivationDto } from './dto/verify-activation.dto';
import { CryptoUtil } from '../../common/utils/crypto.util';
import {
  PlatformActivationInviteEmailJob,
  PlatformInvoiceEmailJob,
  PlatformPaymentFailedEmailJob,
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
    payment?: {
      entity?: {
        id?: string;
        amount?: number;
      };
    };
    invoice?: {
      entity?: {
        id?: string;
        short_url?: string;
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

  /** Self-serve plan switch (confirmed 2026-08-03) — only for an already
   * ACTIVE tenant, never part of first-time onboarding. An upgrade is
   * prorated and applied immediately against the existing Razorpay mandate
   * (no new Checkout round-trip needed); a downgrade is scheduled for the
   * end of the current billing cycle and only committed locally once the
   * next `subscription.charged` webhook confirms it actually took effect
   * (see processEvent below) — never optimistically. */
  async switchPlan(
    tenantId: string,
    targetPlanId: string,
  ): Promise<{ scheduled: boolean }> {
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

    const isUpgrade = targetPlan.priceInPaise > subscription.amountInPaise;

    await this.razorpayClient.changePlan({
      razorpaySubscriptionId: subscription.razorpaySubscriptionId,
      planCode: targetPlan.name,
      billingCycle: targetPlan.billingCycle,
      amountInPaise: targetPlan.priceInPaise,
      scheduleChangeAt: isUpgrade ? 'now' : 'cycle_end',
    });

    if (isUpgrade) {
      await this.billingRepo.applyImmediatePlanChange(tenantId, {
        planId: targetPlan.id,
        planCode: targetPlan.name,
        amountInPaise: targetPlan.priceInPaise,
        billingCycle: targetPlan.billingCycle,
      });
      await this.tenantLimits.resetForPlanChange(tenantId);
    } else {
      await this.billingRepo.scheduleDowngrade(tenantId, {
        scheduledPlanId: targetPlan.id,
        scheduledPlanChangeAt: subscription.currentPeriodEnd,
      });
    }

    return { scheduled: !isUpgrade };
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

    return { activated: true };
  }

  async manualActivate(tenantId: string): Promise<void> {
    const tenant = await this.billingRepo.findTenantBasics(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found');
    await this.billingRepo.manualActivate(tenantId);
  }

  listInvoices(tenantId: string) {
    return this.billingRepo.findInvoicesByTenantId(tenantId);
  }

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

    await this.razorpayClient.cancelAtCycleEnd(
      subscription.razorpaySubscriptionId,
    );
    await this.billingRepo.setCancelAtPeriodEnd(tenantId, true);
  }

  async resumeSubscription(tenantId: string): Promise<void> {
    const subscription =
      await this.billingRepo.findSubscriptionByTenantId(tenantId);
    if (!subscription) throw new NotFoundException('No subscription found');
    if (
      !subscription.cancelAtPeriodEnd ||
      !subscription.razorpaySubscriptionId
    ) {
      throw new BadRequestException('No scheduled cancellation to resume');
    }

    await this.razorpayClient.resumeScheduledCancellation(
      subscription.razorpaySubscriptionId,
    );
    await this.billingRepo.setCancelAtPeriodEnd(tenantId, false);
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

    const subscriptionId = payload.payload?.subscription?.entity?.id;
    if (!subscriptionId) return; // an event type we don't act on

    const eventId = eventIdHeader ?? `${subscriptionId}:${payload.event}`;
    const existing = await this.billingRepo.findWebhookEvent(eventId);
    if (existing?.status === 'PROCESSED') return;

    const record =
      existing ??
      (await this.billingRepo.createWebhookEvent(
        eventId,
        payload.event ?? 'unknown',
      ));

    try {
      await this.processEvent(payload, subscriptionId);
      await this.billingRepo.markWebhookProcessed(record.id);
    } catch (error) {
      await this.billingRepo.markWebhookFailed(
        record.id,
        (error as Error).message,
      );
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
    const invoiceEntity = payload.payload?.invoice?.entity;
    const subscriptionEntity = payload.payload?.subscription?.entity;

    if (payload.event === 'subscription.charged') {
      await this.billingRepo.createInvoice({
        tenantId: subscription.tenantId,
        platformSubscriptionId: subscription.id,
        razorpayInvoiceId: invoiceEntity?.id ?? null,
        razorpayPaymentId: paymentEntity?.id ?? null,
        amountInPaise: paymentEntity?.amount ?? subscription.amountInPaise,
        status: PlatformInvoiceStatus.PAID,
        invoiceUrl: invoiceEntity?.short_url ?? null,
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

      // A scheduled downgrade (switchPlan, cycle_end) finally taking
      // effect — this charge is for the new cycle, so commit the plan
      // change locally now rather than optimistically at request time.
      if (subscription.scheduledPlanId) {
        const scheduledPlan = await this.plansRepo.findById(
          subscription.scheduledPlanId,
        );
        if (scheduledPlan) {
          await this.billingRepo.finalizeScheduledPlanChange(
            subscription.tenantId,
            {
              planId: scheduledPlan.id,
              planCode: scheduledPlan.name,
              amountInPaise: scheduledPlan.priceInPaise,
              billingCycle: scheduledPlan.billingCycle,
            },
          );
          await this.tenantLimits.resetForPlanChange(subscription.tenantId);
        }
      }

      const owner = await this.billingRepo.findOwnerEmail(
        subscription.tenantId,
      );
      if (owner) {
        await this.enqueueInvoiceEmail({
          email: owner.email,
          businessName: tenant.name,
          amountInPaise: paymentEntity?.amount ?? subscription.amountInPaise,
          invoiceUrl: invoiceEntity?.short_url ?? null,
        });
      }
    } else if (payload.event === 'subscription.payment.failed') {
      await this.billingRepo.createInvoice({
        tenantId: subscription.tenantId,
        platformSubscriptionId: subscription.id,
        razorpayInvoiceId: invoiceEntity?.id ?? null,
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
    } else if (payload.event === 'subscription.halted') {
      await this.billingRepo.haltSubscriptionAndSuspendTenant(
        subscription.tenantId,
      );
    } else if (payload.event === 'subscription.cancelled') {
      // The scheduled cancel-at-cycle-end (see scheduleCancellation) taking
      // effect — Razorpay stops billing rights and moves the subscription
      // to its terminal cancelled state.
      await this.billingRepo.markCancelled(subscription.tenantId);
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
