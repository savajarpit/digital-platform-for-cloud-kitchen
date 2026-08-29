import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformPlansRepository } from './platform-plans.repository';
import { TenantLimitsRepository } from '../tenant-limits/tenant-limits.repository';
import { SettingsRepository } from '../settings/settings.repository';
import { UpsertPlatformPlanDto } from './dto/upsert-platform-plan.dto';
import { DateUtil } from '../../common/utils/date.util';
import { PlatformSubscriptionStatus } from '../../generated/prisma';

@Injectable()
export class PlatformPlansService {
  constructor(
    private readonly plansRepo: PlatformPlansRepository,
    private readonly limitsRepo: TenantLimitsRepository,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  findAllAdmin() {
    return this.plansRepo.findAll();
  }

  findPublished() {
    return this.plansRepo.findPublished();
  }

  async create(dto: UpsertPlatformPlanDto) {
    return this.plansRepo.create(dto);
  }

  async update(id: string, dto: UpsertPlatformPlanDto) {
    await this.assertExists(id);
    return this.plansRepo.update(id, dto);
  }

  async delete(id: string): Promise<void> {
    await this.assertExists(id);
    const referencedBy = await this.plansRepo.countSubscriptionsReferencing(id);
    if (referencedBy > 0) {
      throw new BadRequestException(
        'This plan is still assigned to at least one subscription (current or scheduled) — reassign or wait for it to change plans before deleting.',
      );
    }
    await this.plansRepo.delete(id);
  }

  /** Plans this tenant could switch to right now — excludes the current
   * plan itself, and any plan whose caps wouldn't even fit what the tenant
   * is already using (confirmed 2026-08-03: never offer a "downgrade" that
   * would instantly put them over the new limit). Requires an ACTIVE
   * PlatformSubscription — switching is a self-serve action for an
   * already-paying tenant, not part of first-time onboarding. */
  async getEligiblePlansForTenant(tenantId: string) {
    const subscription = await this.limitsRepo.findPlanDefaults(tenantId);
    if (
      !subscription ||
      subscription.status !== PlatformSubscriptionStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Plan switching is only available once your current plan is active.',
      );
    }

    // Status stays ACTIVE for the whole cancelAtPeriodEnd window (it only
    // flips to CANCELLED once the period actually ends), so this needs its
    // own check — switching plans mid-cancellation would leave a confusing
    // double-scheduled state. Short-circuits before the usage/plan queries
    // below since there's nothing eligible to show anyway.
    if (subscription.cancelAtPeriodEnd) {
      return {
        currentPlanId: subscription.planId,
        currentAmountInPaise: subscription.amountInPaise,
        plans: [],
        pendingSwitch: null,
        cancelAtPeriodEnd: true,
        cancelsOn: subscription.currentPeriodEnd,
        trialEndsAt: null,
      };
    }

    // Same reasoning as the cancelAtPeriodEnd short-circuit above — a trial
    // subscription is already ACTIVE, so it'd otherwise sail through to the
    // eligible-plans list. Switching mid-trial silently cancels the
    // never-charged trial subscription and replaces it with one that starts
    // billing immediately (see switchPlan()'s own guard for the full
    // reasoning) — blocked here too so the UI never even offers it.
    if (subscription.trialEndsAt && subscription.trialEndsAt > new Date()) {
      return {
        currentPlanId: subscription.planId,
        currentAmountInPaise: subscription.amountInPaise,
        plans: [],
        pendingSwitch: null,
        cancelAtPeriodEnd: false,
        cancelsOn: null,
        trialEndsAt: subscription.trialEndsAt,
      };
    }

    const profile = await this.settingsRepo.findBusinessProfile(tenantId);
    const timezone = profile?.timezone ?? 'Asia/Kolkata';
    const { monthStart, monthEnd } = DateUtil.getTenantCurrentMonth(timezone);
    const [ordersUsed, subscribersUsed, allPublished] = await Promise.all([
      this.limitsRepo.countMonthlyOrders(tenantId, monthStart, monthEnd),
      this.limitsRepo.countActiveSubscribers(tenantId),
      this.plansRepo.findPublished(),
    ]);

    const eligible = allPublished
      .filter((plan) => plan.id !== subscription.planId)
      .filter(
        (plan) =>
          plan.defaultMaxOrdersPerMonth >= ordersUsed &&
          plan.defaultMaxSubscribers >= subscribersUsed,
      )
      .map((plan) => ({
        ...plan,
        isUpgrade: plan.priceInPaise > subscription.amountInPaise,
      }));

    return {
      currentPlanId: subscription.planId,
      currentAmountInPaise: subscription.amountInPaise,
      plans: eligible,
      pendingSwitch: subscription.scheduledPlan
        ? {
            planName: subscription.scheduledPlan.name,
            changeAt: subscription.scheduledPlanChangeAt,
          }
        : null,
      cancelAtPeriodEnd: false,
      cancelsOn: null,
      trialEndsAt: null,
    };
  }

  private async assertExists(id: string): Promise<void> {
    const plan = await this.plansRepo.findById(id);
    if (!plan) throw new NotFoundException('Plan not found');
  }
}
