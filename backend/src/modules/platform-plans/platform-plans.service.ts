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
    };
  }

  private async assertExists(id: string): Promise<void> {
    const plan = await this.plansRepo.findById(id);
    if (!plan) throw new NotFoundException('Plan not found');
  }
}
