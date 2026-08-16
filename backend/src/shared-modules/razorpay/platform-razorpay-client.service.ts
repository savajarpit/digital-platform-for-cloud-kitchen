import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import Razorpay from 'razorpay';
import { BillingCycle } from '../../generated/prisma';

/** The Razorpay SDK rejects with a plain object, not an Error instance —
 * but only for a *formatted* API error; an auth/network-level failure (e.g.
 * "Subscriptions not enabled for this account") comes back shaped like
 * `{ statusCode: 401, error: "Unauthorized" }`, a plain string, not this
 * `{code, description}` object. Check the nested shape too, not just that
 * an `error` key exists, or a real message silently becomes "[undefined]
 * undefined" in the log. */
interface RazorpaySdkError {
  statusCode: string | number;
  error: { code: string; description: string };
}

function isRazorpaySdkError(error: unknown): error is RazorpaySdkError {
  if (typeof error !== 'object' || error === null || !('error' in error)) {
    return false;
  }
  const inner = (error as { error: unknown }).error;
  return typeof inner === 'object' && inner !== null && 'code' in inner;
}

// Razorpay Subscriptions requires a finite total_count of billing cycles —
// there's no "forever" option. 10 years' worth per cycle is effectively
// indefinite for a SaaS subscription; SUPER_ADMIN can always create a fresh
// subscription later if one genuinely runs out.
const TOTAL_COUNT_BY_CYCLE: Record<BillingCycle, number> = {
  MONTHLY: 120,
  YEARLY: 10,
};

const PERIOD_BY_CYCLE: Record<BillingCycle, 'monthly' | 'yearly'> = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};

export interface CreatedSubscription {
  razorpaySubscriptionId: string;
  shortUrl: string;
}

export interface FetchedSubscription {
  status: string;
  customerId: string | null;
  currentEnd: number | null; // unix seconds
}

/**
 * Wraps the Razorpay SDK for Arpit's own platform account (env-configured —
 * never a tenant's PaymentSettings row). Used only by the platform-billing
 * flow: charging tenant OWNERs for the platform subscription itself. See
 * RazorpayClientService for the per-tenant equivalent used for order
 * checkout.
 */
@Injectable()
export class PlatformRazorpayClientService {
  private readonly logger = new Logger(PlatformRazorpayClientService.name);

  constructor(private readonly config: ConfigService) {}

  getKeyId(): string {
    return this.requireCredentials().keyId;
  }

  async createPlanAndSubscription(params: {
    planCode: string;
    billingCycle: BillingCycle;
    amountInPaise: number;
  }): Promise<CreatedSubscription> {
    const client = this.getClient();

    try {
      const plan = await client.plans.create({
        period: PERIOD_BY_CYCLE[params.billingCycle],
        interval: 1,
        item: {
          name: `Platform subscription — ${params.planCode}`,
          amount: params.amountInPaise,
          currency: 'INR',
        },
      });

      const subscription = await client.subscriptions.create({
        plan_id: plan.id,
        total_count: TOTAL_COUNT_BY_CYCLE[params.billingCycle],
        customer_notify: 1,
        notes: { planCode: params.planCode },
      });

      return {
        razorpaySubscriptionId: subscription.id,
        shortUrl: subscription.short_url,
      };
    } catch (error) {
      this.logError('create platform plan/subscription', error);
      throw new InternalServerErrorException(
        'Could not start the activation payment — please try again in a moment.',
      );
    }
  }

  async fetchSubscription(
    razorpaySubscriptionId: string,
  ): Promise<FetchedSubscription> {
    const client = this.getClient();
    try {
      const subscription = await client.subscriptions.fetch(
        razorpaySubscriptionId,
      );
      return {
        status: subscription.status,
        customerId: subscription.customer_id ?? null,
        currentEnd: subscription.current_end ?? null,
      };
    } catch (error) {
      this.logError('fetch platform subscription', error);
      throw new InternalServerErrorException(
        'Could not confirm the subscription — please try again in a moment.',
      );
    }
  }

  /**
   * Schedules cancellation for the end of the current billing cycle — the
   * subscription keeps billing rights and stays `active` until
   * `current_end`, then Razorpay itself transitions it to `cancelled` and
   * fires the `subscription.cancelled` webhook. Never cancels immediately.
   */
  async cancelAtCycleEnd(razorpaySubscriptionId: string): Promise<void> {
    const client = this.getClient();
    try {
      await client.subscriptions.cancel(razorpaySubscriptionId, true);
    } catch (error) {
      this.logError('schedule platform subscription cancellation', error);
      throw new InternalServerErrorException(
        'Could not schedule cancellation — please try again in a moment.',
      );
    }
  }

  /**
   * Self-serve plan switch (confirmed 2026-08-03) — updates the SAME
   * subscription's plan in place via Razorpay's native subscription-update
   * API, rather than cancelling and recreating: an upgrade
   * (`scheduleChangeAt: 'now'`) is prorated and charged against the
   * existing mandate immediately, no new Checkout round-trip needed; a
   * downgrade (`scheduleChangeAt: 'cycle_end'`) is scheduled for the next
   * billing cycle, no immediate charge. Creates a fresh Razorpay `plan` for
   * the target tier first, same as {@link createPlanAndSubscription} —
   * Razorpay plans are immutable, so a tier change always needs a new one.
   */
  async changePlan(params: {
    razorpaySubscriptionId: string;
    planCode: string;
    billingCycle: BillingCycle;
    amountInPaise: number;
    scheduleChangeAt: 'now' | 'cycle_end';
  }): Promise<void> {
    const client = this.getClient();
    try {
      const plan = await client.plans.create({
        period: PERIOD_BY_CYCLE[params.billingCycle],
        interval: 1,
        item: {
          name: `Platform subscription — ${params.planCode}`,
          amount: params.amountInPaise,
          currency: 'INR',
        },
      });

      await client.subscriptions.update(params.razorpaySubscriptionId, {
        plan_id: plan.id,
        schedule_change_at: params.scheduleChangeAt,
        customer_notify: 1,
      });
    } catch (error) {
      this.logError('change platform subscription plan', error);
      throw new InternalServerErrorException(
        'Could not switch plans right now — please try again in a moment.',
      );
    }
  }

  /**
   * Undoes a cancellation scheduled via {@link cancelAtCycleEnd}, as long as
   * the current billing cycle hasn't ended yet (Razorpay's generic
   * "scheduled changes" mechanism — `has_scheduled_changes` — covers both
   * plan-change and cancel-at-cycle-end scheduling).
   */
  async resumeScheduledCancellation(
    razorpaySubscriptionId: string,
  ): Promise<void> {
    const client = this.getClient();
    try {
      await client.subscriptions.cancelScheduledChanges(razorpaySubscriptionId);
    } catch (error) {
      this.logError('resume platform subscription', error);
      throw new InternalServerErrorException(
        'Could not resume the subscription — please try again in a moment.',
      );
    }
  }

  /** Razorpay's subscription-checkout signature formula: payment_id|subscription_id. */
  verifySubscriptionPaymentSignature(params: {
    razorpayPaymentId: string;
    razorpaySubscriptionId: string;
    razorpaySignature: string;
  }): boolean {
    const { keySecret } = this.requireCredentials();
    const expected = createHmac('sha256', keySecret)
      .update(`${params.razorpayPaymentId}|${params.razorpaySubscriptionId}`)
      .digest('hex');
    return safeEqual(expected, params.razorpaySignature);
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const webhookSecret = this.config.get<string>(
      'platformBilling.razorpayWebhookSecret',
    );
    if (!webhookSecret) return false;
    const expected = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    return safeEqual(expected, signature);
  }

  private getClient(): Razorpay {
    const { keyId, keySecret } = this.requireCredentials();
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  private requireCredentials(): { keyId: string; keySecret: string } {
    const keyId = this.config.get<string>('platformBilling.razorpayKeyId');
    const keySecret = this.config.get<string>(
      'platformBilling.razorpayKeySecret',
    );
    if (!keyId || !keySecret) {
      throw new InternalServerErrorException(
        'Platform billing is not configured yet — set PLATFORM_RAZORPAY_KEY_ID/SECRET.',
      );
    }
    return { keyId, keySecret };
  }

  private logError(action: string, error: unknown): void {
    if (isRazorpaySdkError(error)) {
      this.logger.error(
        `Failed to ${action}: [${error.error.code}] ${error.error.description}`,
      );
    } else {
      this.logger.error(
        `Failed to ${action}`,
        error instanceof Error ? error.stack : JSON.stringify(error),
      );
    }
  }
}

function safeEqual(expected: string, actual: string): boolean {
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(actual, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
