import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import Razorpay from 'razorpay';
import { SettingsRepository } from '../../modules/settings/settings.repository';
import { CryptoUtil } from '../../common/utils/crypto.util';

interface TenantRazorpayCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

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

/**
 * Wraps the Razorpay SDK for a specific tenant's own account (each tenant
 * has their own Razorpay account per the platform's architecture — this is
 * never the platform's own Razorpay credentials, see PlatformSubscription
 * for that, planned separately). Shared by both the `orders` module (order
 * creation) and the `payments` module (verify/webhook) without either
 * depending on the other — avoids a circular module dependency.
 */
@Injectable()
export class RazorpayClientService {
  private readonly logger = new Logger(RazorpayClientService.name);

  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly config: ConfigService,
  ) {}

  async createOrder(
    tenantId: string,
    params: {
      amountInPaise: number;
      receipt: string;
      notes?: Record<string, string>;
    },
  ): Promise<{ razorpayOrderId: string; keyId: string }> {
    const { keyId, keySecret } = await this.getCredentials(tenantId);
    const client = new Razorpay({ key_id: keyId, key_secret: keySecret });

    try {
      const order = await client.orders.create({
        amount: params.amountInPaise,
        currency: 'INR',
        receipt: params.receipt,
        notes: params.notes,
      });
      return { razorpayOrderId: order.id, keyId };
    } catch (error) {
      if (isRazorpaySdkError(error)) {
        this.logger.error(
          `Razorpay order creation failed for tenant ${tenantId}: [${error.error.code}] ${error.error.description}`,
        );
      } else {
        this.logger.error(
          `Razorpay order creation failed for tenant ${tenantId}`,
          error instanceof Error ? error.stack : JSON.stringify(error),
        );
      }
      throw new InternalServerErrorException(
        'Could not start payment — please try again in a moment.',
      );
    }
  }

  /**
   * Refunds (fully or partially) an already-captured payment on the
   * tenant's own Razorpay account — used by the admin cancel-refund flow,
   * never automatically. `notes` surfaces in the tenant's own Razorpay
   * dashboard so a manual reconciliation there can trace it back to this
   * app's cancellation.
   */
  async refundPayment(
    tenantId: string,
    params: {
      razorpayPaymentId: string;
      amountInPaise: number;
      notes?: Record<string, string>;
    },
  ): Promise<{ razorpayRefundId: string }> {
    const { keyId, keySecret } = await this.getCredentials(tenantId);
    const client = new Razorpay({ key_id: keyId, key_secret: keySecret });

    try {
      const refund = await client.payments.refund(params.razorpayPaymentId, {
        amount: params.amountInPaise,
        notes: params.notes,
      });
      return { razorpayRefundId: refund.id };
    } catch (error) {
      if (isRazorpaySdkError(error)) {
        this.logger.error(
          `Razorpay refund failed for tenant ${tenantId}: [${error.error.code}] ${error.error.description}`,
        );
        throw new BadRequestException(
          `Razorpay refund failed: ${error.error.description}`,
        );
      }
      this.logger.error(
        `Razorpay refund failed for tenant ${tenantId}`,
        error instanceof Error ? error.stack : JSON.stringify(error),
      );
      throw new InternalServerErrorException(
        'Could not process the Razorpay refund — please try again in a moment.',
      );
    }
  }

  /**
   * The id of the payment that captured `razorpayOrderId` on the tenant's
   * account, or null if none has (still attempting, failed or abandoned).
   * The payment-check job's source of truth for a payment whose browser
   * confirmation and webhook both never arrived. Throws on an API/network
   * failure so the caller can retry on its next run rather than treat it as
   * "not paid".
   */
  async findCapturedPaymentId(
    tenantId: string,
    razorpayOrderId: string,
  ): Promise<string | null> {
    const { keyId, keySecret } = await this.getCredentials(tenantId);
    const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    try {
      const { items } = await client.orders.fetchPayments(razorpayOrderId);
      return items.find((p) => p.status === 'captured')?.id ?? null;
    } catch (error) {
      const detail = isRazorpaySdkError(error)
        ? `[${error.error.code}] ${error.error.description}`
        : error instanceof Error
          ? error.message
          : JSON.stringify(error);
      throw new InternalServerErrorException(
        `Could not fetch payments for Razorpay order ${razorpayOrderId}: ${detail}`,
      );
    }
  }

  async verifyPaymentSignature(
    tenantId: string,
    params: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ): Promise<boolean> {
    const { keySecret } = await this.getCredentials(tenantId);
    const expected = createHmac('sha256', keySecret)
      .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
      .digest('hex');
    return safeEqual(expected, params.razorpaySignature);
  }

  async verifyWebhookSignature(
    tenantId: string,
    rawBody: Buffer,
    signature: string,
  ): Promise<boolean> {
    const { webhookSecret } = await this.getCredentials(tenantId);
    if (!webhookSecret) return false;
    const expected = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    return safeEqual(expected, signature);
  }

  private async getCredentials(
    tenantId: string,
  ): Promise<TenantRazorpayCredentials> {
    const settings = await this.settingsRepo.findPaymentSettings(tenantId);
    if (!settings?.razorpayKeyId || !settings.razorpayKeySecretEncrypted) {
      throw new BadRequestException(
        'This business has not configured payments yet.',
      );
    }

    const encryptionKey = this.config.get<string>('app.encryptionKey');
    if (!encryptionKey) {
      throw new BadRequestException('Payment configuration is incomplete.');
    }

    return {
      keyId: settings.razorpayKeyId,
      keySecret: CryptoUtil.decrypt(
        settings.razorpayKeySecretEncrypted,
        encryptionKey,
      ),
      webhookSecret: settings.razorpayWebhookSecretEncrypted
        ? CryptoUtil.decrypt(
            settings.razorpayWebhookSecretEncrypted,
            encryptionKey,
          )
        : undefined,
    };
  }
}

function safeEqual(expected: string, actual: string): boolean {
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(actual, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
