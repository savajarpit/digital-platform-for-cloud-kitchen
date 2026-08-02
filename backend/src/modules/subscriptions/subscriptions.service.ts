import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SubscriptionsRepository } from './subscriptions.repository';
import { AddressesService } from '../addresses/addresses.service';
import { PromotionsService } from '../promotions/promotions.service';
import { SettingsRepository } from '../settings/settings.repository';
import { RazorpayClientService } from '../../shared-modules/razorpay/razorpay-client.service';
import { PaginationService } from '../../common/services/pagination.service';
import { DateUtil } from '../../common/utils/date.util';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpsertPlanDaysDto } from './dto/upsert-plan-days.dto';
import { PublishPlanDto } from './dto/publish-plan.dto';
import { QueryAdminPlansDto } from './dto/query-admin-plans.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { VerifyPlanPaymentDto } from './dto/verify-plan-payment.dto';
import { SkipDayDto } from './dto/skip-day.dto';
import { PauseDto } from './dto/pause.dto';

const PREVIEW_DAYS_AHEAD = 14;

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionsRepo: SubscriptionsRepository,
    private readonly addressesService: AddressesService,
    private readonly promotionsService: PromotionsService,
    private readonly settingsRepo: SettingsRepository,
    private readonly razorpayClient: RazorpayClientService,
    private readonly pagination: PaginationService,
  ) {}

  // ─── Admin plan CRUD ─────────────────────────────────────

  async findPlansForAdmin(tenantId: string, query: QueryAdminPlansDto) {
    const skip = this.pagination.getOffsetSkip(query.page, query.limit);
    const [data, total] = await this.subscriptionsRepo.findPlansForTenant(
      tenantId,
      skip,
      query.limit,
    );
    return {
      data,
      meta: this.pagination.buildOffsetMeta(total, query.page, query.limit),
    };
  }

  async findPlanForAdmin(tenantId: string, id: string) {
    const plan = await this.subscriptionsRepo.findPlanByIdAdmin(tenantId, id);
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  createPlan(tenantId: string, dto: CreatePlanDto) {
    return this.subscriptionsRepo.createPlan(tenantId, dto);
  }

  async updatePlan(tenantId: string, id: string, dto: UpdatePlanDto) {
    await this.findPlanForAdmin(tenantId, id);
    return this.subscriptionsRepo.updatePlan(id, dto);
  }

  async deletePlan(tenantId: string, id: string): Promise<void> {
    await this.findPlanForAdmin(tenantId, id);
    await this.subscriptionsRepo.deletePlan(id);
  }

  async publishPlan(tenantId: string, id: string, dto: PublishPlanDto) {
    await this.findPlanForAdmin(tenantId, id);
    return this.subscriptionsRepo.updatePlan(id, {
      isPublished: dto.isPublished,
    });
  }

  async replacePlanDays(tenantId: string, id: string, dto: UpsertPlanDaysDto) {
    await this.findPlanForAdmin(tenantId, id);
    const dayNumbers = dto.days.map((d) => d.dayNumber);
    if (new Set(dayNumbers).size !== dayNumbers.length) {
      throw new BadRequestException('Duplicate dayNumber in plan days');
    }
    await this.subscriptionsRepo.replacePlanDays(id, dto.days);
    return this.findPlanForAdmin(tenantId, id);
  }

  async findAllSubscriptionsForAdmin(
    tenantId: string,
    query: QueryAdminPlansDto,
  ) {
    const skip = this.pagination.getOffsetSkip(query.page, query.limit);
    const [data, total] = await this.subscriptionsRepo.findAllForTenantAdmin(
      tenantId,
      skip,
      query.limit,
    );
    return {
      data,
      meta: this.pagination.buildOffsetMeta(total, query.page, query.limit),
    };
  }

  // ─── Storefront (public) ─────────────────────────────────

  findPublishedPlans(tenantId: string) {
    return this.subscriptionsRepo.findPublishedPlans(tenantId);
  }

  async findPublishedPlan(tenantId: string, id: string) {
    const plan = await this.subscriptionsRepo.findPublishedPlanById(
      tenantId,
      id,
    );
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  // ─── Subscribe + payment ─────────────────────────────────

  async subscribe(tenantId: string, userId: string, dto: SubscribeDto) {
    const plan = await this.subscriptionsRepo.findPlanForSubscribe(
      tenantId,
      dto.planId,
    );
    if (!plan) throw new NotFoundException('Plan not found or not available');

    // Confirms the address is real and belongs to this customer — same
    // ownership check checkout already does for a regular order.
    await this.addressesService.findOne(tenantId, userId, dto.addressId);

    let discountInPaise = 0;
    let couponId: string | undefined;
    let resolvedCouponCode: string | undefined;
    if (dto.couponCode) {
      const result = await this.promotionsService.validatePlanCoupon(
        tenantId,
        dto.couponCode,
        userId,
        plan.priceInPaise,
      );
      discountInPaise = result.discountInPaise;
      couponId = result.couponId;
      resolvedCouponCode = result.code;
    }
    const amountInPaise = Math.max(0, plan.priceInPaise - discountInPaise);

    const bonusDays = await this.promotionsService.getApplicablePlanBonusDays(
      tenantId,
      plan.id,
      plan.durationDays,
    );

    const subscription = await this.subscriptionsRepo.createSubscription({
      tenantId,
      userId,
      planId: plan.id,
      addressId: dto.addressId,
      priceInPaiseSnapshot: amountInPaise,
      durationDaysSnapshot: plan.durationDays + bonusDays,
      planNameSnapshot: plan.name,
    });

    // Recorded at subscribe-time, not payment-confirmation — mirrors the
    // existing order-checkout coupon-redemption convention (CouponRedemption
    // is written at order creation, before Razorpay payment completes).
    if (couponId && resolvedCouponCode) {
      await this.promotionsService.recordPlanCouponRedemption(
        tenantId,
        couponId,
        userId,
        subscription.id,
      );
    }

    const { razorpayOrderId, keyId } = await this.razorpayClient.createOrder(
      tenantId,
      {
        amountInPaise,
        receipt: `SUB-${subscription.id.slice(0, 8)}`,
      },
    );

    await this.subscriptionsRepo.createInvoice({
      tenantId,
      subscriptionId: subscription.id,
      razorpayOrderId,
      amountInPaise,
    });

    return {
      subscriptionId: subscription.id,
      razorpayOrderId,
      razorpayKeyId: keyId,
      amountInPaise,
    };
  }

  async verifyPayment(
    tenantId: string,
    userId: string,
    dto: VerifyPlanPaymentDto,
  ): Promise<{ confirmed: true }> {
    const invoice = await this.subscriptionsRepo.findInvoiceByRazorpayOrderId(
      dto.razorpayOrderId,
    );
    if (!invoice || invoice.tenantId !== tenantId) {
      throw new NotFoundException('Payment not found');
    }
    const subscription = await this.subscriptionsRepo.findSubscriptionById(
      tenantId,
      invoice.subscriptionId,
    );
    if (!subscription || subscription.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    if (invoice.status === 'PAID') return { confirmed: true };

    const valid = await this.razorpayClient.verifyPaymentSignature(
      tenantId,
      dto,
    );
    if (!valid) throw new BadRequestException('Payment verification failed');

    await this.subscriptionsRepo.markInvoicePaid(
      invoice.id,
      dto.razorpayPaymentId,
    );

    const startDate = DateUtil.now();
    const cycleEnd = DateUtil.addDays(
      startDate,
      subscription.durationDaysSnapshot - 1,
    );
    await this.subscriptionsRepo.activateSubscription(subscription.id, {
      startDate,
      cycleEnd,
    });

    return { confirmed: true };
  }

  // ─── Customer: my subscriptions ──────────────────────────

  findMySubscriptions(tenantId: string, userId: string) {
    return this.subscriptionsRepo.findMySubscriptions(tenantId, userId);
  }

  async findMySubscription(tenantId: string, userId: string, id: string) {
    const subscription = await this.subscriptionsRepo.findMySubscriptionById(
      tenantId,
      userId,
      id,
    );
    if (!subscription) throw new NotFoundException('Subscription not found');

    const timezone = await this.getTenantTimezone(tenantId);
    const upcoming = buildUpcomingPreview(subscription, timezone);
    return { ...subscription, upcoming };
  }

  async skipDay(tenantId: string, userId: string, id: string, dto: SkipDayDto) {
    const subscription = await this.getOwnedActiveSubscription(
      tenantId,
      userId,
      id,
    );
    await this.assertFutureCutoff(tenantId, dto.date);
    await this.subscriptionsRepo.createSkip({
      subscriptionId: subscription.id,
      dateFrom: dto.date,
      dateTo: dto.date,
      bankedDays: 1,
    });
    const newCycleEnd = DateUtil.addDays(subscription.cycleEnd as Date, 1);
    return this.subscriptionsRepo.extendCycleEnd(
      subscription.id,
      newCycleEnd,
      1,
    );
  }

  async pause(tenantId: string, userId: string, id: string, dto: PauseDto) {
    const subscription = await this.getOwnedActiveSubscription(
      tenantId,
      userId,
      id,
    );
    if (dto.dateTo < dto.dateFrom) {
      throw new BadRequestException('dateTo must not be before dateFrom');
    }
    await this.assertFutureCutoff(tenantId, dto.dateFrom);
    const bankedDays = DateUtil.enumerateDateStrs(
      dto.dateFrom,
      dto.dateTo,
    ).length;
    await this.subscriptionsRepo.createSkip({
      subscriptionId: subscription.id,
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      bankedDays,
    });
    const newCycleEnd = DateUtil.addDays(
      subscription.cycleEnd as Date,
      bankedDays,
    );
    return this.subscriptionsRepo.extendCycleEnd(
      subscription.id,
      newCycleEnd,
      bankedDays,
    );
  }

  async cancel(tenantId: string, userId: string, id: string) {
    await this.getOwnedActiveSubscription(tenantId, userId, id);
    return this.subscriptionsRepo.cancelSubscription(id);
  }

  private async getOwnedActiveSubscription(
    tenantId: string,
    userId: string,
    id: string,
  ) {
    const subscription = await this.subscriptionsRepo.findSubscriptionById(
      tenantId,
      id,
    );
    if (!subscription || subscription.userId !== userId) {
      throw new NotFoundException('Subscription not found');
    }
    if (subscription.status !== 'ACTIVE') {
      throw new BadRequestException('This subscription is not active');
    }
    return subscription;
  }

  /** A skip/pause can only be scheduled for a day that hasn't already
   * materialized — same "before it's prepared" cutoff Arpit asked for,
   * reusing the tenant's own order-acceptance cutoff concept: today only
   * qualifies if the daily cutoff time hasn't passed yet. */
  private async assertFutureCutoff(
    tenantId: string,
    dateStr: string,
  ): Promise<void> {
    const timezone = await this.getTenantTimezone(tenantId);
    const { dateStr: todayStr, minutesSinceMidnight } =
      DateUtil.getTenantNow(timezone);
    if (dateStr > todayStr) return;
    if (dateStr < todayStr) {
      throw new BadRequestException('Cannot skip/pause a date in the past');
    }
    const acceptance =
      await this.settingsRepo.findOrderAcceptanceSettings(tenantId);
    const cutoffMinutes = acceptance?.dailyCutoffTime
      ? DateUtil.hhmmToMinutes(acceptance.dailyCutoffTime)
      : 0;
    if (minutesSinceMidnight >= cutoffMinutes) {
      throw new BadRequestException(
        "Today's cutoff has already passed — this can only be skipped for a future day now.",
      );
    }
  }

  private async getTenantTimezone(tenantId: string): Promise<string> {
    const profile = await this.settingsRepo.findBusinessProfile(tenantId);
    return profile?.timezone ?? 'Asia/Kolkata';
  }
}

export interface UpcomingPreviewDay {
  date: string;
  skipped: boolean;
  meals: { slotType: string; name: string | null }[];
}

/** Projects the next PREVIEW_DAYS_AHEAD calendar days (capped at cycleEnd) —
 * a skipped day consumes no template day (mirrors the real materialization
 * job exactly: nextPlanDayNumber only advances on a day that actually gets
 * prepared), and the template loops via modulo once its own day count is
 * exhausted, so bonus/banked days beyond the template's length still show
 * a real (repeated) day instead of going blank. */
function buildUpcomingPreview(
  subscription: {
    nextPlanDayNumber: number;
    cycleEnd: Date | null;
    skips: { dateFrom: string; dateTo: string }[];
    plan: {
      durationDays: number;
      days: {
        dayNumber: number;
        slots: { slotType: string; meal: { name: string } | null }[];
      }[];
    };
  },
  timezone: string,
): UpcomingPreviewDay[] {
  if (!subscription.cycleEnd) return [];
  const { dateStr: todayStr } = DateUtil.getTenantNow(timezone);
  const cycleEndStr = DateUtil.toTenantDateStr(subscription.cycleEnd, timezone);

  const daysByNumber = new Map(
    subscription.plan.days.map((d) => [d.dayNumber, d]),
  );
  const preview: UpcomingPreviewDay[] = [];
  let cursor = todayStr;
  let counter = subscription.nextPlanDayNumber;

  for (let i = 0; i < PREVIEW_DAYS_AHEAD && cursor <= cycleEndStr; i++) {
    const skip = subscription.skips.find(
      (s) => s.dateFrom <= cursor && cursor <= s.dateTo,
    );
    if (skip) {
      preview.push({ date: cursor, skipped: true, meals: [] });
    } else {
      const templateDayNumber =
        ((counter - 1) % subscription.plan.durationDays) + 1;
      const planDay = daysByNumber.get(templateDayNumber);
      const meals = (planDay?.slots ?? []).map((slot) => ({
        slotType: slot.slotType,
        name: slot.meal?.name ?? null,
      }));
      preview.push({ date: cursor, skipped: false, meals });
      counter += 1;
    }
    cursor = DateUtil.addDaysToDateStr(cursor, 1);
  }
  return preview;
}
