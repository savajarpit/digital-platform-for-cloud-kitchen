import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SettingsRepository } from '../settings/settings.repository';
import { PaginationService } from '../../common/services/pagination.service';
import { DateUtil } from '../../common/utils/date.util';
import { PlanScheduleUtil } from '../../common/utils/plan-schedule.util';
import { DeclareDisruptionDto } from './dto/declare-disruption.dto';
import {
  Subscription,
  SubscriptionPlanSchedulingMode,
  SubscriptionStatus,
} from '../../generated/prisma';
import { SubscriptionDisruptedJob } from '../notifications/notifications.processor';

/**
 * Tenant-declared, one-time real-world disruption (heavy rain, a kitchen
 * emergency, "I can't cook today") — distinct from a customer's own
 * skip/pause. Kept as its own service rather than folded into
 * SubscriptionsService (already large) since it's a self-contained flow:
 * create an audit row, then for every affected subscriber create a normal
 * SubscriptionSkip (reason + disruptionId set) — that alone is what gates
 * materialization out, with zero special-case code, and never touches any
 * already-existing Order (a past/already-materialized date has already run;
 * this only ever affects a NOT-YET-materialized future date).
 */
@Injectable()
export class SubscriptionDisruptionService {
  constructor(
    private readonly subscriptionsRepo: SubscriptionsRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly pagination: PaginationService,
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue<SubscriptionDisruptedJob>,
  ) {}

  async declareDisruption(
    tenantId: string,
    createdByUserId: string,
    dto: DeclareDisruptionDto,
  ) {
    const timezone = await this.getTenantTimezone(tenantId);
    const { dateStr: todayStr } = DateUtil.getTenantNow(timezone);
    if (dto.date < todayStr) {
      throw new BadRequestException(
        'Cannot declare a disruption for a date in the past',
      );
    }

    const compensationDays = dto.compensationDays ?? 1;
    const targets = await this.resolveTargets(tenantId, dto);
    if (targets.length === 0) {
      throw new NotFoundException(
        dto.scope === 'SINGLE'
          ? 'Subscription not found or not active'
          : 'No currently-active subscribers on this plan',
      );
    }

    const disruption = await this.subscriptionsRepo.createDisruption({
      tenantId,
      planId: dto.scope === 'PLAN' ? (dto.planId ?? null) : null,
      date: dto.date,
      reason: dto.reason,
      compensationDays,
      createdByUserId,
    });

    // Sequential, not Promise.all — this can touch many subscribers at once
    // (whole-plan scope) and each iteration does several dependent writes
    // (skip -> banked cycleEnd -> queue) that don't need to race each other.
    for (const subscription of targets) {
      await this.subscriptionsRepo.createSkip({
        subscriptionId: subscription.id,
        dateFrom: dto.date,
        dateTo: dto.date,
        bankedDays: compensationDays,
        reason: dto.reason,
        disruptionId: disruption.id,
      });
      const newCycleEnd = await this.bankExtraDays(
        tenantId,
        subscription.planId,
        subscription.cycleEnd as Date,
        compensationDays,
      );
      await this.subscriptionsRepo.extendCycleEnd(
        subscription.id,
        newCycleEnd,
        compensationDays,
      );
      await this.notificationsQueue.add(
        'subscription-disrupted',
        {
          tenantId,
          subscriptionId: subscription.id,
          dateLabel: dto.date,
          reason: dto.reason,
          compensationDays,
        },
        { jobId: `subscription-disrupted:${subscription.id}:${dto.date}` },
      );
    }

    return disruption;
  }

  async listDisruptions(tenantId: string, page: number, limit: number) {
    const skip = this.pagination.getOffsetSkip(page, limit);
    const [data, total] = await this.subscriptionsRepo.findDisruptionsForAdmin(
      tenantId,
      skip,
      limit,
    );
    return { data, meta: this.pagination.buildOffsetMeta(total, page, limit) };
  }

  private async resolveTargets(
    tenantId: string,
    dto: DeclareDisruptionDto,
  ): Promise<Subscription[]> {
    if (dto.scope === 'SINGLE') {
      if (!dto.subscriptionId) {
        throw new BadRequestException(
          'subscriptionId is required for scope SINGLE',
        );
      }
      const subscription = await this.subscriptionsRepo.findByIdForTenantAdmin(
        tenantId,
        dto.subscriptionId,
      );
      if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
        return [];
      }
      return [subscription];
    }

    if (!dto.planId) {
      throw new BadRequestException('planId is required for scope PLAN');
    }
    return this.subscriptionsRepo.findActiveSubscriptionsForPlan(
      tenantId,
      dto.planId,
    );
  }

  /** Same off-day-aware banking math as SubscriptionsService.bankExtraDays —
   * duplicated rather than shared via a public method, since exposing it
   * would widen SubscriptionsService's surface for a single caller; both
   * independently delegate to the real shared logic in PlanScheduleUtil. */
  private async bankExtraDays(
    tenantId: string,
    planId: string,
    currentCycleEnd: Date,
    bankedDaysDelta: number,
  ): Promise<Date> {
    const plan = await this.subscriptionsRepo.findPlanScheduleConfig(planId);
    if (
      !plan ||
      plan.schedulingMode !== SubscriptionPlanSchedulingMode.WEEKLY_FIXED
    ) {
      return DateUtil.addDays(currentCycleEnd, bankedDaysDelta);
    }
    const timezone = await this.getTenantTimezone(tenantId);
    const currentCycleEndStr = DateUtil.toTenantDateStr(
      currentCycleEnd,
      timezone,
    );
    const deliveryDayKeys =
      await this.subscriptionsRepo.findPlanDeliveryDayKeys(planId);
    const newCycleEndStr = PlanScheduleUtil.advanceRealDeliveryDays(
      plan,
      deliveryDayKeys,
      currentCycleEndStr,
      bankedDaysDelta,
      false,
    );
    return new Date(`${newCycleEndStr}T00:00:00.000Z`);
  }

  private async getTenantTimezone(tenantId: string): Promise<string> {
    const profile = await this.settingsRepo.findBusinessProfile(tenantId);
    return profile?.timezone ?? 'Asia/Kolkata';
  }
}
