import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SubscriptionsRepository } from './subscriptions.repository';
import { AddressesService } from '../addresses/addresses.service';
import { PromotionsService } from '../promotions/promotions.service';
import { SettingsRepository } from '../settings/settings.repository';
import { FeaturesService } from '../features/features.service';
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
import { SetDayOverrideDto } from './dto/set-day-override.dto';
import { UpdateSubscriptionSettingsDto } from './dto/update-subscription-settings.dto';

const PREVIEW_DAYS_AHEAD = 14;
const CANCEL_FEATURE_KEY = 'subscription-self-cancel';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionsRepo: SubscriptionsRepository,
    private readonly addressesService: AddressesService,
    private readonly promotionsService: PromotionsService,
    private readonly settingsRepo: SettingsRepository,
    private readonly featuresService: FeaturesService,
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

  // ─── Admin: tenant subscription settings ─────────────────

  async getSettings(tenantId: string) {
    const settings = await this.subscriptionsRepo.findSettings(tenantId);
    return (
      settings ?? {
        isAcceptingNewSubscriptions: true,
        closureReason: null,
        noticeHoursBeforeDelivery: 24,
      }
    );
  }

  updateSettings(tenantId: string, dto: UpdateSubscriptionSettingsDto) {
    return this.subscriptionsRepo.upsertSettings(tenantId, dto);
  }

  // ─── Admin: today's deliveries ───────────────────────────

  /** Two views of the same data: a kitchen prep sheet (meal → total
   * quantity needed today, across every staggered subscriber) and a
   * dispatch list (per-subscriber address/time/meals) — built from the
   * real materialized Order rows, so it reflects whatever the nightly job
   * actually resolved (incl. day overrides), not a re-derived guess. */
  async getTodaysDeliveries(tenantId: string) {
    const timezone = await this.getTenantTimezone(tenantId);
    const { dateStr: todayStr } = DateUtil.getTenantNow(timezone);
    const now = DateUtil.now();
    const orders = await this.subscriptionsRepo.findSubscriptionOrdersInRange(
      tenantId,
      DateUtil.addDays(now, -1),
      DateUtil.addDays(now, 1),
    );
    const todaysOrders = orders.filter(
      (o) => DateUtil.toTenantDateStr(o.deliveryDate, timezone) === todayStr,
    );

    const prepMap = new Map<string, number>();
    for (const order of todaysOrders) {
      for (const item of order.items) {
        prepMap.set(
          item.nameSnapshot,
          (prepMap.get(item.nameSnapshot) ?? 0) + item.quantity,
        );
      }
    }
    const prepSheet = Array.from(prepMap, ([mealName, quantity]) => ({
      mealName,
      quantity,
    })).sort((a, b) => b.quantity - a.quantity);

    const dispatch = todaysOrders.map((order) => ({
      orderId: order.id,
      customerName:
        `${order.user.firstName} ${order.user.lastName ?? ''}`.trim(),
      customerEmail: order.user.email,
      planName: order.subscription?.planNameSnapshot ?? 'Subscription',
      address: `${order.address.line1}, ${order.address.city}`,
      deliverySlotName: order.deliverySlotName,
      deliveryWindowStart: order.deliveryWindowStart,
      deliveryWindowEnd: order.deliveryWindowEnd,
      meals: order.items.map((i) => `${i.nameSnapshot} x${i.quantity}`),
    }));

    return { date: todayStr, prepSheet, dispatch };
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
    const settings = await this.subscriptionsRepo.findSettings(tenantId);
    if (settings && !settings.isAcceptingNewSubscriptions) {
      throw new BadRequestException(
        settings.closureReason ||
          'This business is not accepting new subscriptions right now.',
      );
    }

    const plan = await this.subscriptionsRepo.findPlanForSubscribe(
      tenantId,
      dto.planId,
    );
    if (!plan) throw new NotFoundException('Plan not found or not available');

    // Confirms the address is real and belongs to this customer — same
    // ownership check checkout already does for a regular order.
    await this.addressesService.findOne(tenantId, userId, dto.addressId);

    if (dto.deliverySlotId) {
      const slot = await this.subscriptionsRepo.findDeliverySlotById(
        tenantId,
        dto.deliverySlotId,
      );
      if (!slot) throw new BadRequestException('Invalid delivery slot');
    }

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
      deliverySlotId: dto.deliverySlotId,
      priceInPaiseSnapshot: amountInPaise,
      durationDaysSnapshot: plan.durationDays + bonusDays,
      planNameSnapshot: plan.name,
      couponCode: resolvedCouponCode,
      bonusDaysGranted: bonusDays,
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

    // Day 1 is always the next day, never today — materialization is a
    // once-nightly batch job, so "today" has either already run (and this
    // subscription didn't exist yet) or won't run again until tonight.
    // Trying to allow same-day delivery based on a notice-hours cutoff
    // would be misleading: the cron wouldn't actually pick it up anyway.
    const startDate = DateUtil.addDays(DateUtil.now(), 1);
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

    const [timezone, addresses, deliverySlots, canCancel] = await Promise.all([
      this.getTenantTimezone(tenantId),
      this.addressesService.findAll(tenantId, userId),
      this.settingsRepo.findActiveDeliverySlots(tenantId),
      this.featuresService.hasFeature(tenantId, CANCEL_FEATURE_KEY),
    ]);
    const upcoming = buildUpcomingPreview(subscription, timezone);
    return { ...subscription, upcoming, addresses, deliverySlots, canCancel };
  }

  async getInvoice(tenantId: string, userId: string, id: string) {
    const subscription =
      await this.subscriptionsRepo.findSubscriptionByIdWithAddress(
        tenantId,
        id,
      );
    if (!subscription || subscription.userId !== userId) {
      throw new NotFoundException('Subscription not found');
    }
    const invoice = await this.subscriptionsRepo.findInvoiceBySubscriptionId(
      subscription.id,
    );
    if (!invoice) throw new NotFoundException('Invoice not found');
    return { invoice, subscription };
  }

  async skipDay(tenantId: string, userId: string, id: string, dto: SkipDayDto) {
    const subscription = await this.getOwnedActiveSubscription(
      tenantId,
      userId,
      id,
    );
    await this.assertWithinNoticeWindow(tenantId, dto.date);
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
    await this.assertWithinNoticeWindow(tenantId, dto.dateFrom);
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

  async setDayOverride(
    tenantId: string,
    userId: string,
    id: string,
    dto: SetDayOverrideDto,
  ) {
    const subscription = await this.getOwnedActiveSubscription(
      tenantId,
      userId,
      id,
    );
    await this.assertWithinNoticeWindow(tenantId, dto.date);
    if (!dto.addressId && !dto.deliverySlotId) {
      throw new BadRequestException(
        'Provide at least an addressId or a deliverySlotId to override',
      );
    }
    if (dto.addressId) {
      await this.addressesService.findOne(tenantId, userId, dto.addressId);
    }
    if (dto.deliverySlotId) {
      const slot = await this.subscriptionsRepo.findDeliverySlotById(
        tenantId,
        dto.deliverySlotId,
      );
      if (!slot) throw new BadRequestException('Invalid delivery slot');
    }
    return this.subscriptionsRepo.upsertDayOverride(subscription.id, dto.date, {
      addressId: dto.addressId,
      deliverySlotId: dto.deliverySlotId,
    });
  }

  async cancel(tenantId: string, userId: string, id: string) {
    const allowed = await this.featuresService.hasFeature(
      tenantId,
      CANCEL_FEATURE_KEY,
    );
    if (!allowed) {
      throw new ForbiddenException(
        'Self-service cancellation is not available for this business — contact them directly.',
      );
    }
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

  /** The single lead-time rule governing skip/pause/day-override edits —
   * a change must land at least noticeHoursBeforeDelivery from now, a real
   * date-string comparison rather than an instant race against the nightly
   * cron's own fixed run time. */
  private async assertWithinNoticeWindow(
    tenantId: string,
    dateStr: string,
  ): Promise<void> {
    const timezone = await this.getTenantTimezone(tenantId);
    const { dateStr: todayStr } = DateUtil.getTenantNow(timezone);
    if (dateStr < todayStr) {
      throw new BadRequestException('Cannot change a date in the past');
    }
    const settings = await this.subscriptionsRepo.findSettings(tenantId);
    const noticeHours = settings?.noticeHoursBeforeDelivery ?? 24;
    const earliestInstant = DateUtil.addMinutes(
      DateUtil.now(),
      noticeHours * 60,
    );
    const earliestDateStr = DateUtil.toTenantDateStr(earliestInstant, timezone);
    if (dateStr < earliestDateStr) {
      throw new BadRequestException(
        `Changes need at least ${noticeHours}h notice — the earliest editable day is ${earliestDateStr}.`,
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
  meals: {
    slotType: string;
    mealId: string | null;
    name: string | null;
    imageUrl: string | null;
  }[];
  addressId: string;
  deliverySlotId: string | null;
  isOverridden: boolean;
}

/** Projects the next PREVIEW_DAYS_AHEAD calendar days (capped at cycleEnd) —
 * a skipped day consumes no template day (mirrors the real materialization
 * job exactly: nextPlanDayNumber only advances on a day that actually gets
 * prepared), and the template loops via modulo once its own day count is
 * exhausted, so bonus/banked days beyond the template's length still show
 * a real (repeated) day instead of going blank. Each day also resolves its
 * effective address/slot — a SubscriptionDayOverride if one exists for
 * that date, else the subscription's own default. */
function buildUpcomingPreview(
  subscription: {
    nextPlanDayNumber: number;
    startDate: Date | null;
    cycleEnd: Date | null;
    addressId: string;
    deliverySlotId: string | null;
    skips: { dateFrom: string; dateTo: string }[];
    dayOverrides: {
      date: string;
      addressId: string | null;
      deliverySlotId: string | null;
    }[];
    plan: {
      durationDays: number;
      days: {
        dayNumber: number;
        slots: {
          slotType: string;
          meal: { id: string; name: string; imageUrl: string | null } | null;
        }[];
      }[];
    };
  },
  timezone: string,
): UpcomingPreviewDay[] {
  if (!subscription.cycleEnd || !subscription.startDate) return [];
  const { dateStr: todayStr } = DateUtil.getTenantNow(timezone);
  const cycleEndStr = DateUtil.toTenantDateStr(subscription.cycleEnd, timezone);
  const startDateStr = DateUtil.toTenantDateStr(
    subscription.startDate,
    timezone,
  );

  const daysByNumber = new Map(
    subscription.plan.days.map((d) => [d.dayNumber, d]),
  );
  const overridesByDate = new Map(
    subscription.dayOverrides.map((o) => [o.date, o]),
  );
  const preview: UpcomingPreviewDay[] = [];
  // Never starts before Day 1 actually begins — matches the scheduler's
  // own startDateStr guard, so the preview never shows a day the nightly
  // job wouldn't actually materialize.
  let cursor = todayStr > startDateStr ? todayStr : startDateStr;
  let counter = subscription.nextPlanDayNumber;

  for (let i = 0; i < PREVIEW_DAYS_AHEAD && cursor <= cycleEndStr; i++) {
    const skip = subscription.skips.find(
      (s) => s.dateFrom <= cursor && cursor <= s.dateTo,
    );
    const override = overridesByDate.get(cursor);
    const addressId = override?.addressId ?? subscription.addressId;
    const deliverySlotId =
      override?.deliverySlotId ?? subscription.deliverySlotId ?? null;

    if (skip) {
      preview.push({
        date: cursor,
        skipped: true,
        meals: [],
        addressId,
        deliverySlotId,
        isOverridden: Boolean(override),
      });
    } else {
      const templateDayNumber =
        ((counter - 1) % subscription.plan.durationDays) + 1;
      const planDay = daysByNumber.get(templateDayNumber);
      const meals = (planDay?.slots ?? []).map((slot) => ({
        slotType: slot.slotType,
        mealId: slot.meal?.id ?? null,
        name: slot.meal?.name ?? null,
        imageUrl: slot.meal?.imageUrl ?? null,
      }));
      preview.push({
        date: cursor,
        skipped: false,
        meals,
        addressId,
        deliverySlotId,
        isOverridden: Boolean(override),
      });
      counter += 1;
    }
    cursor = DateUtil.addDaysToDateStr(cursor, 1);
  }
  return preview;
}
