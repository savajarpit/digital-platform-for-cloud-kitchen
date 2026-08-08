import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { TenantLimitsRepository } from './tenant-limits.repository';
import { SettingsRepository } from '../settings/settings.repository';
import { DateUtil } from '../../common/utils/date.util';
import { UpdateTenantLimitsDto } from './dto/update-tenant-limits.dto';
import { PlatformLimitAlertEmailJob } from '../../shared-modules/queue/processors/mail.processor';

// A tenant is nudged once it crosses this fraction of its effective cap —
// before that, it's just normal usage, nothing worth surfacing.
const NEAR_LIMIT_THRESHOLD = 0.8;

export interface UsageStat {
  used: number;
  max: number | null;
  nearLimit: boolean;
  hitLimit: boolean;
  blockedAttempts: number;
}

export interface UsageSummary {
  orders: UsageStat;
  subscribers: UsageStat;
}

@Injectable()
export class TenantLimitsService {
  private readonly logger = new Logger(TenantLimitsService.name);

  constructor(
    private readonly limitsRepo: TenantLimitsRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly config: ConfigService,
    @InjectQueue('mail') private readonly mailQueue: Queue,
  ) {}

  /** Override always wins; otherwise the tenant's PlatformPlan default; null (no plan, no override) means unenforced. */
  async getEffectiveLimits(
    tenantId: string,
  ): Promise<{ maxOrders: number | null; maxSubscribers: number | null }> {
    const [limits, subscription] = await Promise.all([
      this.limitsRepo.findByTenantId(tenantId),
      this.limitsRepo.findPlanDefaults(tenantId),
    ]);
    return {
      maxOrders:
        limits?.maxOrdersOverride ??
        subscription?.plan?.defaultMaxOrdersPerMonth ??
        null,
      maxSubscribers:
        limits?.maxSubscribersOverride ??
        subscription?.plan?.defaultMaxSubscribers ??
        null,
    };
  }

  /** Called from OrdersService.create() before an order is actually created. Throws if the tenant's monthly order cap is hit. */
  async assertOrderAllowed(tenantId: string, timezone: string): Promise<void> {
    const { maxOrders } = await this.getEffectiveLimits(tenantId);
    if (maxOrders === null) return;

    const { monthStr, monthStart, monthEnd } =
      DateUtil.getTenantCurrentMonth(timezone);
    const used = await this.limitsRepo.countMonthlyOrders(
      tenantId,
      monthStart,
      monthEnd,
    );

    if (used >= maxOrders) {
      await this.recordBlockedAttempt(tenantId, 'order', monthStr);
      throw new BadRequestException(
        "This business has reached its plan's monthly order limit — please try again later or contact them directly.",
      );
    }

    await this.maybeAlertNearLimit(
      tenantId,
      'order',
      used,
      maxOrders,
      monthStr,
    );
  }

  /** Called from SubscriptionsService.subscribe() before a subscription is created. Throws if the tenant's concurrent active-subscriber cap is hit. */
  async assertSubscriberAllowed(tenantId: string): Promise<void> {
    const { maxSubscribers } = await this.getEffectiveLimits(tenantId);
    if (maxSubscribers === null) return;

    const used = await this.limitsRepo.countActiveSubscribers(tenantId);
    if (used >= maxSubscribers) {
      await this.recordBlockedAttempt(tenantId, 'subscriber');
      throw new BadRequestException(
        "This business has reached its plan's subscriber limit — please try again later or contact them directly.",
      );
    }

    await this.maybeAlertNearLimit(
      tenantId,
      'subscriber',
      used,
      maxSubscribers,
    );
  }

  /** Called from AuthService.register() — a no-op unless SUPER_ADMIN has explicitly turned this on for the tenant (off by default, always). */
  async assertSignupAllowed(tenantId: string, timezone: string): Promise<void> {
    const limits = await this.limitsRepo.findByTenantId(tenantId);
    if (!limits?.signupLimitEnabled || limits.maxSignupsPerMonth === null) {
      return;
    }

    const { monthStr, monthStart, monthEnd } =
      DateUtil.getTenantCurrentMonth(timezone);
    const used = await this.limitsRepo.countMonthlySignups(
      tenantId,
      monthStart,
      monthEnd,
    );

    if (used >= (limits.maxSignupsPerMonth ?? 0)) {
      const isNewMonth = limits.blockedSignupAttemptsMonth !== monthStr;
      await this.limitsRepo.upsert(tenantId, {
        blockedSignupAttempts: isNewMonth
          ? 1
          : limits.blockedSignupAttempts + 1,
        blockedSignupAttemptsMonth: monthStr,
      });
      throw new BadRequestException(
        'Signups are temporarily paused for this business — please try again later.',
      );
    }
  }

  async getUsageSummary(
    tenantId: string,
    timezone: string,
  ): Promise<UsageSummary> {
    const [{ maxOrders, maxSubscribers }, limits] = await Promise.all([
      this.getEffectiveLimits(tenantId),
      this.limitsRepo.findByTenantId(tenantId),
    ]);
    const { monthStr, monthStart, monthEnd } =
      DateUtil.getTenantCurrentMonth(timezone);
    const [ordersUsed, subscribersUsed] = await Promise.all([
      this.limitsRepo.countMonthlyOrders(tenantId, monthStart, monthEnd),
      this.limitsRepo.countActiveSubscribers(tenantId),
    ]);

    return {
      orders: this.buildStat(
        ordersUsed,
        maxOrders,
        limits?.blockedOrderAttemptsMonth === monthStr
          ? (limits?.blockedOrderAttempts ?? 0)
          : 0,
      ),
      subscribers: this.buildStat(
        subscribersUsed,
        maxSubscribers,
        limits?.blockedSubscriberAttempts ?? 0,
      ),
    };
  }

  /** Admin (SUPER_ADMIN) view/edit — raising a cap clears the stale blocked-attempt counters and alert dedupe flags tied to it, the natural "problem solved" signal for limits that have no periodic reset of their own. */
  async getTenantLimits(tenantId: string) {
    return (
      (await this.limitsRepo.findByTenantId(tenantId)) ?? {
        maxOrdersOverride: null,
        maxSubscribersOverride: null,
        signupLimitEnabled: false,
        maxSignupsPerMonth: null,
        blockedOrderAttempts: 0,
        blockedSubscriberAttempts: 0,
        blockedSignupAttempts: 0,
      }
    );
  }

  async updateTenantLimits(tenantId: string, dto: UpdateTenantLimitsDto) {
    const existing = await this.limitsRepo.findByTenantId(tenantId);
    const raisedOrders =
      dto.maxOrdersOverride !== undefined &&
      (existing?.maxOrdersOverride ?? -1) < (dto.maxOrdersOverride ?? -1);
    const raisedSubscribers =
      dto.maxSubscribersOverride !== undefined &&
      (existing?.maxSubscribersOverride ?? -1) <
        (dto.maxSubscribersOverride ?? -1);

    return this.limitsRepo.upsert(tenantId, {
      ...dto,
      ...(raisedOrders
        ? {
            blockedOrderAttempts: 0,
            blockedOrderAttemptsMonth: null,
            nearOrderLimitAlertedMonth: null,
            orderLimitHitAlertedMonth: null,
          }
        : {}),
      ...(raisedSubscribers
        ? {
            blockedSubscriberAttempts: 0,
            nearSubscriberLimitAlerted: false,
            subscriberLimitHitAlerted: false,
          }
        : {}),
    });
  }

  /** Called after a plan switch resolves (immediate upgrade, or a scheduled downgrade finally taking effect) — the new plan's caps make every prior blocked/alerted signal stale. */
  async resetForPlanChange(tenantId: string): Promise<void> {
    await this.limitsRepo.upsert(tenantId, {
      maxOrdersOverride: null,
      maxSubscribersOverride: null,
      blockedOrderAttempts: 0,
      blockedOrderAttemptsMonth: null,
      nearOrderLimitAlertedMonth: null,
      orderLimitHitAlertedMonth: null,
      blockedSubscriberAttempts: 0,
      nearSubscriberLimitAlerted: false,
      subscriberLimitHitAlerted: false,
    });
  }

  private buildStat(
    used: number,
    max: number | null,
    blockedAttempts: number,
  ): UsageStat {
    if (max === null) {
      return {
        used,
        max: null,
        nearLimit: false,
        hitLimit: false,
        blockedAttempts: 0,
      };
    }
    return {
      used,
      max,
      nearLimit: used >= max * NEAR_LIMIT_THRESHOLD && used < max,
      hitLimit: used >= max,
      blockedAttempts,
    };
  }

  private async recordBlockedAttempt(
    tenantId: string,
    type: 'order' | 'subscriber',
    monthStr?: string,
  ): Promise<void> {
    const existing = await this.limitsRepo.findByTenantId(tenantId);
    if (type === 'order') {
      const isNewMonth = existing?.blockedOrderAttemptsMonth !== monthStr;
      await this.limitsRepo.upsert(tenantId, {
        blockedOrderAttempts: isNewMonth
          ? 1
          : (existing?.blockedOrderAttempts ?? 0) + 1,
        blockedOrderAttemptsMonth: monthStr,
      });
      if (existing?.orderLimitHitAlertedMonth !== monthStr) {
        await this.limitsRepo.upsert(tenantId, {
          orderLimitHitAlertedMonth: monthStr,
        });
        await this.sendLimitAlert(tenantId, 'order', 'hit');
      }
    } else {
      await this.limitsRepo.upsert(tenantId, {
        blockedSubscriberAttempts:
          (existing?.blockedSubscriberAttempts ?? 0) + 1,
      });
      if (!existing?.subscriberLimitHitAlerted) {
        await this.limitsRepo.upsert(tenantId, {
          subscriberLimitHitAlerted: true,
        });
        await this.sendLimitAlert(tenantId, 'subscriber', 'hit');
      }
    }
  }

  private async maybeAlertNearLimit(
    tenantId: string,
    type: 'order' | 'subscriber',
    used: number,
    max: number,
    monthStr?: string,
  ): Promise<void> {
    if (used < max * NEAR_LIMIT_THRESHOLD) return;

    const existing = await this.limitsRepo.findByTenantId(tenantId);
    if (type === 'order') {
      if (existing?.nearOrderLimitAlertedMonth === monthStr) return;
      await this.limitsRepo.upsert(tenantId, {
        nearOrderLimitAlertedMonth: monthStr,
      });
    } else {
      if (existing?.nearSubscriberLimitAlerted) return;
      await this.limitsRepo.upsert(tenantId, {
        nearSubscriberLimitAlerted: true,
      });
    }
    await this.sendLimitAlert(tenantId, type, 'near');
  }

  /** Fire-and-forget, mirrors the existing platform-billing alert-email pattern — never blocks the order/subscribe request that triggered it over an email hiccup. */
  private async sendLimitAlert(
    tenantId: string,
    type: 'order' | 'subscriber',
    state: 'near' | 'hit',
  ): Promise<void> {
    const alertEmail = this.config.get<string>('platformBilling.alertEmail');
    if (!alertEmail) return;
    const businessName =
      (await this.limitsRepo.findTenantName(tenantId)) ?? 'A tenant';
    const job: PlatformLimitAlertEmailJob = {
      email: alertEmail,
      businessName,
      type,
      state,
    };
    try {
      await this.mailQueue.add('send-platform-limit-alert', job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
    } catch (error) {
      this.logger.warn(
        `Could not enqueue limit-alert email for tenant ${tenantId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
