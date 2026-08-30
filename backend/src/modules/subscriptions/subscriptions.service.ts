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
import {
  PlanScheduleKey,
  PlanScheduleUtil,
} from '../../common/utils/plan-schedule.util';
import {
  SubscriptionOffDayHandling,
  SubscriptionPlanSchedulingMode,
} from '../../generated/prisma';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpsertPlanDaysDto } from './dto/upsert-plan-days.dto';
import { PublishPlanDto } from './dto/publish-plan.dto';
import { QueryAdminPlansDto } from './dto/query-admin-plans.dto';
import { QueryAdminSubscriptionsDto } from './dto/query-admin-subscriptions.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { VerifyPlanPaymentDto } from './dto/verify-plan-payment.dto';
import { SkipDayDto } from './dto/skip-day.dto';
import { PauseDto } from './dto/pause.dto';
import { SetDayOverrideDto } from './dto/set-day-override.dto';
import { UpdateSubscriptionSettingsDto } from './dto/update-subscription-settings.dto';
import { TenantLimitsService } from '../tenant-limits/tenant-limits.service';
import { defaultSubscriptionSettings } from '../../common/constants/tenant-default-content';
import { SubscriptionMaterializationService } from './subscription-materialization.service';

const PREVIEW_DAYS_AHEAD = 14;
const CANCEL_FEATURE_KEY = 'subscription-self-cancel';
// SUPER_ADMIN opt-in — presence of the grant HIDES delivery-time selection
// (both at signup and per-day overrides) rather than unlocking it, so a
// brand-new tenant with no grant row keeps today's working behavior instead
// of silently losing the time picker the moment this feature key exists.
const TIME_LOCK_FEATURE_KEY = 'subscription-plan-time-lock';

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
    private readonly tenantLimits: TenantLimitsService,
    private readonly materializationService: SubscriptionMaterializationService,
  ) {}

  // ─── Admin plan CRUD ─────────────────────────────────────

  async findPlansForAdmin(tenantId: string, query: QueryAdminPlansDto) {
    const skip = this.pagination.getOffsetSkip(query.page, query.limit);
    const [data, total] = await this.subscriptionsRepo.findPlansForTenant(
      tenantId,
      skip,
      query.limit,
      query.search,
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

  /** Projects what a brand-new subscriber's start/end dates would actually
   * be right now, given this plan's current schedule config — the only way
   * to see the effect of EXTEND_TO_COMPENSATE (or confirm LOSS_DELIVERY's
   * flat behavior) without running a real test signup, since the extension
   * is computed per-subscriber at activation and never shown anywhere in
   * the plan-authoring UI itself. Reuses the exact same computation
   * verifyPayment() runs for a real activation — same startDateLeadDays
   * setting, same computeInitialCycleEnd() — so this preview can never
   * drift from what a real subscriber would actually get. */
  async previewPlanCycle(tenantId: string, planId: string) {
    const plan = await this.findPlanForAdmin(tenantId, planId);
    const settings = await this.subscriptionsRepo.findSettings(tenantId);
    const startDateLeadDays = settings?.startDateLeadDays ?? 1;
    const startDate = DateUtil.addDays(DateUtil.now(), startDateLeadDays);
    const cycleEnd = await this.computeInitialCycleEnd(
      tenantId,
      planId,
      startDate,
      plan.durationDays,
    );
    const timezone = await this.getTenantTimezone(tenantId);
    const startDateStr = DateUtil.toTenantDateStr(startDate, timezone);
    const cycleEndStr = DateUtil.toTenantDateStr(cycleEnd, timezone);
    return {
      startDate: startDateStr,
      cycleEnd: cycleEndStr,
      durationDays: plan.durationDays,
      calendarSpanDays: DateUtil.diffInDays(startDateStr, cycleEndStr) + 1,
    };
  }

  async createPlan(tenantId: string, dto: CreatePlanDto) {
    const scheduling = await this.resolveSchedulingFields(tenantId, null, dto);
    return this.subscriptionsRepo.createPlan(tenantId, {
      ...dto,
      ...scheduling,
    });
  }

  async updatePlan(tenantId: string, id: string, dto: UpdatePlanDto) {
    const existing = await this.findPlanForAdmin(tenantId, id);
    if (
      dto.schedulingMode !== undefined &&
      dto.schedulingMode !== existing.schedulingMode
    ) {
      const subscriberCount =
        await this.subscriptionsRepo.countSubscriptionsForPlan(id);
      if (subscriberCount > 0) {
        throw new BadRequestException(
          "This plan already has subscribers, so its scheduling mode can't be changed — create a new plan instead.",
        );
      }
    }
    const scheduling = await this.resolveSchedulingFields(
      tenantId,
      existing,
      dto,
    );
    return this.subscriptionsRepo.updatePlan(id, { ...dto, ...scheduling });
  }

  /** Cross-field validation that class-validator can't express: WEEKLY_FIXED
   * requires weekCount + scheduleAnchorDate (defaulted to the most recent
   * tenant-local Monday if omitted), RELATIVE_DAY nulls both out so a prior
   * WEEKLY_FIXED config never lingers stale after toggling back. */
  private async resolveSchedulingFields(
    tenantId: string,
    existing: {
      schedulingMode: SubscriptionPlanSchedulingMode;
      weekCount: number | null;
      scheduleAnchorDate: string | null;
    } | null,
    dto: {
      schedulingMode?: SubscriptionPlanSchedulingMode;
      weekCount?: number;
      scheduleAnchorDate?: string;
    },
  ): Promise<{
    schedulingMode: SubscriptionPlanSchedulingMode;
    weekCount: number | null;
    scheduleAnchorDate: string | null;
  }> {
    const schedulingMode =
      dto.schedulingMode ??
      existing?.schedulingMode ??
      SubscriptionPlanSchedulingMode.RELATIVE_DAY;

    if (schedulingMode === SubscriptionPlanSchedulingMode.WEEKLY_FIXED) {
      const weekCount = dto.weekCount ?? existing?.weekCount;
      if (!weekCount) {
        throw new BadRequestException(
          'weekCount is required for WEEKLY_FIXED plans',
        );
      }
      let scheduleAnchorDate =
        dto.scheduleAnchorDate ?? existing?.scheduleAnchorDate;
      if (!scheduleAnchorDate) {
        const timezone = await this.getTenantTimezone(tenantId);
        const { dateStr: todayStr } = DateUtil.getTenantNow(timezone);
        scheduleAnchorDate = this.getMostRecentMondayStr(todayStr);
      }
      return { schedulingMode, weekCount, scheduleAnchorDate };
    }

    return { schedulingMode, weekCount: null, scheduleAnchorDate: null };
  }

  private getMostRecentMondayStr(todayStr: string): string {
    let cursor = todayStr;
    while (DateUtil.getDayOfWeekForDateStr(cursor) !== 1) {
      cursor = DateUtil.addDaysToDateStr(cursor, -1);
    }
    return cursor;
  }

  async deletePlan(tenantId: string, id: string): Promise<void> {
    await this.findPlanForAdmin(tenantId, id);
    await this.subscriptionsRepo.deletePlan(id);
  }

  async publishPlan(tenantId: string, id: string, dto: PublishPlanDto) {
    const plan = await this.findPlanForAdmin(tenantId, id);
    if (
      dto.isPublished &&
      plan.schedulingMode === SubscriptionPlanSchedulingMode.WEEKLY_FIXED
    ) {
      this.assertNoHalfConfiguredWeeklyDays(plan);
    }
    return this.subscriptionsRepo.updatePlan(id, {
      isPublished: dto.isPublished,
    });
  }

  /** Blocks publishing a WEEKLY_FIXED plan that has a "half-configured" day
   * — at least one slot checked for that weekday, but none of them have an
   * actual meal picked yet ("to be announced" left as-is). Such a day is
   * indistinguishable from a genuinely off day for scheduling purposes
   * (materialization skips it either way), so it silently confuses
   * customers exactly the way an unfinished week did before this check
   * existed — a real day with zero decided meals reads as "no delivery"
   * rather than "still being planned." Draft (unpublished) saves are never
   * blocked — only the moment a tenant tries to actually go live. A
   * genuinely off day (zero slots checked at all) is unaffected. */
  private assertNoHalfConfiguredWeeklyDays(plan: {
    days: {
      weekNumber: number | null;
      weekday: number | null;
      slots: { meal: { id: string } | null }[];
    }[];
  }): void {
    const halfConfigured = plan.days.filter(
      (d) => d.slots.length > 0 && !d.slots.some((s) => s.meal),
    );
    if (halfConfigured.length === 0) return;
    const labels = halfConfigured
      .map((d) =>
        PlanScheduleUtil.describeKey({
          weekNumber: d.weekNumber ?? 1,
          weekday: d.weekday ?? 0,
        }),
      )
      .join(', ');
    throw new BadRequestException(
      `Pick at least one meal (or uncheck all its slots to mark it off) for: ${labels} — before publishing.`,
    );
  }

  async replacePlanDays(tenantId: string, id: string, dto: UpsertPlanDaysDto) {
    const plan = await this.findPlanForAdmin(tenantId, id);

    if (plan.schedulingMode === SubscriptionPlanSchedulingMode.WEEKLY_FIXED) {
      const keys = new Set<string>();
      for (const day of dto.days) {
        if (day.weekNumber == null || day.weekday == null) {
          throw new BadRequestException(
            'Every day needs a weekNumber and weekday for a WEEKLY_FIXED plan',
          );
        }
        if (day.dayNumber != null) {
          throw new BadRequestException(
            'dayNumber must not be set for a WEEKLY_FIXED plan',
          );
        }
        if (plan.weekCount && day.weekNumber > plan.weekCount) {
          throw new BadRequestException(
            `weekNumber ${day.weekNumber} exceeds this plan's weekCount (${plan.weekCount})`,
          );
        }
        const key = `${day.weekNumber}-${day.weekday}`;
        if (keys.has(key)) {
          throw new BadRequestException(
            `Duplicate day for week ${day.weekNumber}, weekday ${day.weekday}`,
          );
        }
        keys.add(key);
      }
    } else {
      const dayNumbers = dto.days.map((d) => {
        if (d.dayNumber == null) {
          throw new BadRequestException(
            'Every day needs a dayNumber for a RELATIVE_DAY plan',
          );
        }
        if (d.weekNumber != null || d.weekday != null) {
          throw new BadRequestException(
            'weekNumber/weekday must not be set for a RELATIVE_DAY plan',
          );
        }
        return d.dayNumber;
      });
      if (new Set(dayNumbers).size !== dayNumbers.length) {
        throw new BadRequestException('Duplicate dayNumber in plan days');
      }
    }

    await this.subscriptionsRepo.replacePlanDays(id, dto.days);
    return this.findPlanForAdmin(tenantId, id);
  }

  async findAllSubscriptionsForAdmin(
    tenantId: string,
    query: QueryAdminSubscriptionsDto,
  ) {
    const skip = this.pagination.getOffsetSkip(query.page, query.limit);
    const [data, total] = await this.subscriptionsRepo.findAllForTenantAdmin(
      tenantId,
      skip,
      query.limit,
      query.search,
      query.planId,
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
        isEnabled: true,
        isAcceptingNewSubscriptions: true,
        closureReason: null,
        noticeHoursBeforeDelivery: 24,
        startDateLeadDays: 1,
        showOnHomepage: true,
        ...defaultSubscriptionSettings(),
      }
    );
  }

  updateSettings(tenantId: string, dto: UpdateSubscriptionSettingsDto) {
    return this.subscriptionsRepo.upsertSettings(tenantId, dto);
  }

  /** Public: the flags/copy the storefront home page + /plans page need. */
  async getPublicSettings(tenantId: string) {
    const settings = await this.subscriptionsRepo.findSettings(tenantId);
    const defaults = defaultSubscriptionSettings();
    return {
      isEnabled: settings?.isEnabled ?? true,
      showOnHomepage: settings?.showOnHomepage ?? true,
      homepageTitle: settings?.homepageTitle ?? defaults.homepageTitle,
      homepageDescription:
        settings?.homepageDescription ?? defaults.homepageDescription,
      plansPageTitle: settings?.plansPageTitle ?? defaults.plansPageTitle,
      plansPageSubtitle:
        settings?.plansPageSubtitle ?? defaults.plansPageSubtitle,
      whySubscribeEnabled:
        settings?.whySubscribeEnabled ?? defaults.whySubscribeEnabled,
      faqEnabled: settings?.faqEnabled ?? defaults.faqEnabled,
      contactCtaEnabled:
        settings?.contactCtaEnabled ?? defaults.contactCtaEnabled,
      contactCtaTitle: settings?.contactCtaTitle ?? defaults.contactCtaTitle,
      contactCtaDescription:
        settings?.contactCtaDescription ?? defaults.contactCtaDescription,
      contactEmail: settings?.contactEmail ?? null,
    };
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
      orderNumber: order.orderNumber,
      customerName:
        `${order.user.firstName} ${order.user.lastName ?? ''}`.trim(),
      customerEmail: order.user.email,
      planName: order.subscription?.planNameSnapshot ?? 'Subscription',
      // Full structured address (not just a flat "line1, city" string) so
      // the dispatch card can both display and share() the complete,
      // day-accurate delivery address — this is the actual materialized
      // Order's own address, which already reflects whatever day-override
      // won for this specific date, not just the subscription's default.
      // Non-null assert: subscriptions never do pickup (Order.address is
      // only optional for a one-off PICKUP order, which materialization
      // never creates).
      address: {
        line1: order.address!.line1,
        line2: order.address!.line2,
        city: order.address!.city,
        state: order.address!.state,
        pincode: order.address!.pincode,
        contactPhone: order.address!.contactPhone,
        lat: order.address!.lat,
        lng: order.address!.lng,
      },
      deliverySlotName: order.deliverySlotName,
      deliveryWindowStart: order.deliveryWindowStart,
      deliveryWindowEnd: order.deliveryWindowEnd,
      meals: order.items.map((i) => `${i.nameSnapshot} x${i.quantity}`),
      notes: order.notes,
    }));

    return { date: todayStr, prepSheet, dispatch };
  }

  // ─── Storefront (public) ─────────────────────────────────

  async findPublishedPlans(tenantId: string, search?: string) {
    const plans = await this.subscriptionsRepo.findPublishedPlans(
      tenantId,
      search,
    );
    const promoMap =
      await this.promotionsService.getActiveScheduledDiscountsForPlans(
        tenantId,
        plans.map((p) => p.id),
      );
    return plans.map((plan) => ({
      ...plan,
      activePromotion: promoMap.get(plan.id) ?? null,
    }));
  }

  async findPublishedPlan(tenantId: string, id: string) {
    const plan = await this.subscriptionsRepo.findPublishedPlanById(
      tenantId,
      id,
    );
    if (!plan) throw new NotFoundException('Plan not found');
    const [timeLocked, promoMap, timezone] = await Promise.all([
      this.featuresService.hasFeature(tenantId, TIME_LOCK_FEATURE_KEY),
      this.promotionsService.getActiveScheduledDiscountsForPlans(tenantId, [
        plan.id,
      ]),
      this.getTenantTimezone(tenantId),
    ]);
    return {
      ...plan,
      timeSelectionEnabled: !timeLocked,
      activePromotion: promoMap.get(plan.id) ?? null,
      previewWindow:
        plan.schedulingMode === SubscriptionPlanSchedulingMode.WEEKLY_FIXED
          ? buildPlanPreviewWindow(plan, timezone)
          : null,
    };
  }

  // ─── Admin: kitchen prep planner ─────────────────────────

  /** Projected quantities for a specific plan-template day, independent of
   * calendar dates — (active subscriber count on this plan) x (that day's
   * meals). Deliberately NOT a real-date projection: subscribers start on
   * staggered days, so "who's actually on day 3 next Tuesday" would need a
   * full per-subscriber simulation. This answers the simpler, more useful
   * question an owner actually asks: "if everyone on this plan hits day N,
   * what do I prepare?" */
  async getPrepPlan(tenantId: string, planId: string, dayNumber?: number) {
    const plan = await this.subscriptionsRepo.findPlanByIdAdmin(
      tenantId,
      planId,
    );
    if (!plan) throw new NotFoundException('Plan not found');

    let key: PlanScheduleKey;
    let todayStr: string | undefined;
    if (plan.schedulingMode === SubscriptionPlanSchedulingMode.WEEKLY_FIXED) {
      const timezone = await this.getTenantTimezone(tenantId);
      todayStr = DateUtil.getTenantNow(timezone).dateStr;
      key = PlanScheduleUtil.resolveKey(plan, {
        dateStr: todayStr,
        relativeCounter: 1,
      });
    } else {
      if (!dayNumber) {
        throw new BadRequestException(
          'dayNumber is required for RELATIVE_DAY plans',
        );
      }
      key = { dayNumber };
    }

    const [day, subscriberCount] = await Promise.all([
      'dayNumber' in key
        ? this.subscriptionsRepo.findPlanDayWithSlots(planId, key.dayNumber)
        : this.subscriptionsRepo.findPlanDayByWeekAndWeekday(
            planId,
            key.weekNumber,
            key.weekday,
          ),
      // todayStr is only set for WEEKLY_FIXED, where every subscriber shares
      // the same real date — RELATIVE_DAY's projection stays the existing
      // hypothetical "if everyone hit day N" count, skip-unaware, since
      // there's no single shared date to check skips against there.
      this.subscriptionsRepo.countActiveSubscriptionsForPlan(
        tenantId,
        planId,
        todayStr,
      ),
    ]);

    const items = (day?.slots ?? [])
      .filter((slot) => slot.meal)
      .map((slot) => ({
        slotType: slot.slotType,
        mealName: slot.meal!.name,
        quantity: subscriberCount,
      }));

    return {
      planId,
      planName: plan.name,
      schedulingMode: plan.schedulingMode,
      ...('dayNumber' in key
        ? { dayNumber: key.dayNumber }
        : { weekNumber: key.weekNumber, weekday: key.weekday }),
      label: PlanScheduleUtil.describeKey(key),
      subscriberCount,
      items,
    };
  }

  // ─── Subscribe + payment ─────────────────────────────────

  async subscribe(tenantId: string, userId: string, dto: SubscribeDto) {
    const settings = await this.subscriptionsRepo.findSettings(tenantId);
    if (settings && !settings.isEnabled) {
      throw new BadRequestException(
        'Subscriptions are not available for this business right now.',
      );
    }
    if (settings && !settings.isAcceptingNewSubscriptions) {
      throw new BadRequestException(
        settings.closureReason ||
          'This business is not accepting new subscriptions right now.',
      );
    }

    // Platform plan's concurrent active-subscriber cap.
    await this.tenantLimits.assertSubscriberAllowed(tenantId);

    const plan = await this.subscriptionsRepo.findPlanForSubscribe(
      tenantId,
      dto.planId,
    );
    if (!plan) throw new NotFoundException('Plan not found or not available');

    // Confirms the address is real and belongs to this customer — same
    // ownership check checkout already does for a regular order.
    await this.addressesService.findOne(tenantId, userId, dto.addressId);

    if (dto.deliverySlotId) {
      const timeLocked = await this.featuresService.hasFeature(
        tenantId,
        TIME_LOCK_FEATURE_KEY,
      );
      if (timeLocked) {
        throw new BadRequestException(
          'Delivery time selection is disabled for subscription plans — only address changes are available.',
        );
      }
      const slot = await this.subscriptionsRepo.findDeliverySlotById(
        tenantId,
        dto.deliverySlotId,
      );
      if (!slot) throw new BadRequestException('Invalid delivery slot');
    }

    // Automatic (no-code) scheduled discount, if the tenant has one active
    // for this plan — same "additive with the coupon" stacking as checkout's
    // computeCartPromotions + validateCoupon.
    const scheduledDiscountMap =
      await this.promotionsService.getActiveScheduledDiscountsForPlans(
        tenantId,
        [plan.id],
      );
    const scheduledDiscount = scheduledDiscountMap.get(plan.id);
    let discountInPaise = scheduledDiscount
      ? Math.floor(
          (plan.priceInPaise * scheduledDiscount.discountPercentage) / 100,
        )
      : 0;
    let couponId: string | undefined;
    let resolvedCouponCode: string | undefined;
    if (dto.couponCode) {
      const result = await this.promotionsService.validatePlanCoupon(
        tenantId,
        dto.couponCode,
        userId,
        plan.priceInPaise,
      );
      discountInPaise += result.discountInPaise;
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

    // Days out from today, tenant-controlled (SubscriptionSettings.
    // startDateLeadDays, default 1 — matches the platform's original
    // always-tomorrow behavior). A tenant that opts into 0 (same-day) is
    // opting into the inline materialization call below, since the nightly
    // cron already ran/won't run again today.
    const settings = await this.subscriptionsRepo.findSettings(tenantId);
    const startDateLeadDays = settings?.startDateLeadDays ?? 1;
    const startDate = DateUtil.addDays(DateUtil.now(), startDateLeadDays);
    const cycleEnd = await this.computeInitialCycleEnd(
      tenantId,
      subscription.planId,
      startDate,
      subscription.durationDaysSnapshot,
    );
    await this.subscriptionsRepo.activateSubscription(subscription.id, {
      startDate,
      cycleEnd,
    });

    if (startDateLeadDays === 0) {
      const materializable =
        await this.subscriptionsRepo.findSubscriptionForMaterialization(
          subscription.id,
        );
      if (materializable) {
        await this.materializationService.materializeOne(materializable);
      }
    }

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
    const [addresses, deliverySlots, canCancel, timeLocked, earliest] =
      await Promise.all([
        this.addressesService.findAll(tenantId, userId),
        this.settingsRepo.findActiveDeliverySlots(tenantId),
        this.featuresService.hasFeature(tenantId, CANCEL_FEATURE_KEY),
        this.featuresService.hasFeature(tenantId, TIME_LOCK_FEATURE_KEY),
        this.getEarliestEditableDate(tenantId, timezone),
      ]);
    const canOverrideTime = !timeLocked;
    const upcoming = buildUpcomingPreview(
      subscription,
      timezone,
      earliest.dateStr,
    );
    return {
      ...subscription,
      upcoming,
      addresses,
      deliverySlots,
      canCancel,
      canOverrideTime,
      earliestEditableDate: earliest.dateStr,
    };
  }

  async findSubscriptionForAdmin(tenantId: string, id: string) {
    const subscription = await this.subscriptionsRepo.findByIdForTenantAdmin(
      tenantId,
      id,
    );
    if (!subscription) throw new NotFoundException('Subscription not found');
    const invoice = await this.subscriptionsRepo.findInvoiceBySubscriptionId(
      subscription.id,
    );
    return { ...subscription, invoice };
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
    const newCycleEnd = await this.bankExtraDays(
      tenantId,
      subscription.planId,
      subscription.cycleEnd as Date,
      1,
    );
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
    const newCycleEnd = await this.bankExtraDays(
      tenantId,
      subscription.planId,
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
    if (!dto.addressId && !dto.deliverySlotId && dto.note === undefined) {
      throw new BadRequestException(
        'Provide at least an addressId, a deliverySlotId, or a note to override',
      );
    }
    if (dto.addressId) {
      await this.addressesService.findOne(tenantId, userId, dto.addressId);
    }
    if (dto.deliverySlotId) {
      const timeLocked = await this.featuresService.hasFeature(
        tenantId,
        TIME_LOCK_FEATURE_KEY,
      );
      if (timeLocked) {
        throw new BadRequestException(
          'Delivery time selection is disabled for subscription plans — only address changes are available.',
        );
      }
      const slot = await this.subscriptionsRepo.findDeliverySlotById(
        tenantId,
        dto.deliverySlotId,
      );
      if (!slot) throw new BadRequestException('Invalid delivery slot');
    }
    return this.subscriptionsRepo.upsertDayOverride(subscription.id, dto.date, {
      addressId: dto.addressId,
      deliverySlotId: dto.deliverySlotId,
      note: dto.note,
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
   * cron's own fixed run time. Shared with findMySubscription() so the
   * frontend can grey out unchangeable days up front instead of letting the
   * customer submit and land on a rejection. */
  private async getEarliestEditableDate(
    tenantId: string,
    timezone: string,
  ): Promise<{ dateStr: string; noticeHours: number }> {
    const settings = await this.subscriptionsRepo.findSettings(tenantId);
    const noticeHours = settings?.noticeHoursBeforeDelivery ?? 24;
    const earliestInstant = DateUtil.addMinutes(
      DateUtil.now(),
      noticeHours * 60,
    );
    return {
      dateStr: DateUtil.toTenantDateStr(earliestInstant, timezone),
      noticeHours,
    };
  }

  private async assertWithinNoticeWindow(
    tenantId: string,
    dateStr: string,
  ): Promise<void> {
    const timezone = await this.getTenantTimezone(tenantId);
    const { dateStr: todayStr } = DateUtil.getTenantNow(timezone);
    if (dateStr < todayStr) {
      throw new BadRequestException('Cannot change a date in the past');
    }
    const { dateStr: earliestDateStr, noticeHours } =
      await this.getEarliestEditableDate(tenantId, timezone);
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

  /** A NEW subscription's cycleEnd at activation. LOSS_DELIVERY (default,
   * every plan today): today's exact existing flat startDate + durationDays
   * - 1, byte-identical, zero regression risk. EXTEND_TO_COMPENSATE
   * (WEEKLY_FIXED only): walks forward counting only real delivery days so
   * the subscriber still receives exactly durationDaysSnapshot deliveries,
   * regardless of how many off-weekdays fall inside the span. */
  private async computeInitialCycleEnd(
    tenantId: string,
    planId: string,
    startDate: Date,
    durationDaysSnapshot: number,
  ): Promise<Date> {
    const plan = await this.subscriptionsRepo.findPlanScheduleConfig(planId);
    if (
      plan?.schedulingMode === SubscriptionPlanSchedulingMode.WEEKLY_FIXED &&
      plan.offDayHandling === SubscriptionOffDayHandling.EXTEND_TO_COMPENSATE
    ) {
      const timezone = await this.getTenantTimezone(tenantId);
      const startDateStr = DateUtil.toTenantDateStr(startDate, timezone);
      const deliveryDayKeys =
        await this.subscriptionsRepo.findPlanDeliveryDayKeys(planId);
      const cycleEndStr = PlanScheduleUtil.advanceRealDeliveryDays(
        plan,
        deliveryDayKeys,
        startDateStr,
        durationDaysSnapshot,
        true,
      );
      return new Date(`${cycleEndStr}T00:00:00.000Z`);
    }
    return DateUtil.addDays(startDate, durationDaysSnapshot - 1);
  }

  /** Advances a subscription's cycleEnd by `bankedDaysDelta` REAL delivery
   * days, skipping any WEEKLY_FIXED off-weekday along the way — landing a
   * banked/credited day on a day with no deliveries at all would defeat
   * the entire point of banking. Always applied, regardless of the plan's
   * offDayHandling (that toggle only governs the INITIAL duration at
   * activation, not what a credited day lands on). No-op behavior change
   * for RELATIVE_DAY plans, which have no off-day concept. Shared by
   * skipDay()/pause() and the tenant disruption tool. */
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
}

export interface PlanPreviewDay {
  date: string;
  meals: {
    slotType: string;
    mealId: string | null;
    name: string | null;
    imageUrl: string | null;
  }[];
}

// Safety cap only — not a product decision. The real stopping condition is
// "enough calendar days to cover durationDays" (below); this just prevents
// a runaway loop if a plan somehow has zero decided days anywhere.
const PLAN_PREVIEW_MAX_DAYS = 60;

/** Pre-purchase browsing preview for a WEEKLY_FIXED plan — there's no
 * subscription yet, so this skips all the subscription-specific machinery
 * (skip/override/lock/cycleEnd) buildUpcomingPreview() needs. Walks forward
 * from tomorrow (Day 1 is always next-day, matching verifyPayment()'s own
 * rule — materialization is a nightly batch job, the storefront shouldn't
 * visually promise a same-day dish a real subscribe wouldn't actually
 * deliver) and stops once it's shown exactly what a real subscriber would
 * actually get: LOSS_DELIVERY shows durationDays flat calendar days
 * (off days included, but they still count against the total, same as
 * activation); EXTEND_TO_COMPENSATE keeps going until durationDays REAL
 * (non-off) days have appeared — the exact same rule computeInitialCycleEnd()
 * uses for a real activation, so the preview can never promise more or
 * fewer days than an actual subscriber ends up with. Previously this walked
 * a fixed 14 calendar days regardless of durationDays/offDayHandling — for
 * a short plan (e.g. 7 days) that showed a full 2 extra weeks of content no
 * subscriber would ever actually receive. */
function buildPlanPreviewWindow(
  plan: {
    schedulingMode: SubscriptionPlanSchedulingMode;
    durationDays: number;
    weekCount: number | null;
    scheduleAnchorDate: string | null;
    offDayHandling: SubscriptionOffDayHandling;
    days: {
      weekNumber: number | null;
      weekday: number | null;
      slots: {
        slotType: string;
        meal: { id: string; name: string; imageUrl: string | null } | null;
      }[];
    }[];
  },
  timezone: string,
): PlanPreviewDay[] {
  const { dateStr: todayStr } = DateUtil.getTenantNow(timezone);
  const byWeekWeekday = new Map(
    plan.days.map((d) => [`${d.weekNumber}-${d.weekday}`, d]),
  );
  // Same rule as SubscriptionsRepository.findPlanDeliveryDayKeys — a
  // checked-but-TBD slot still counts as a real day, only zero checked
  // slots at all is genuinely off. Computed inline here (not via that
  // repo method) since plan.days is already loaded for this call.
  const deliveryDayKeys = new Set(
    plan.days
      .filter((d) => d.slots.length > 0)
      .map((d) => `${d.weekNumber}-${d.weekday}`),
  );
  const extendMode =
    plan.offDayHandling === SubscriptionOffDayHandling.EXTEND_TO_COMPENSATE;
  // A plan with zero checked slots anywhere (nothing authored yet) has no
  // real day to ever find — extend mode would otherwise silently walk all
  // the way to PLAN_PREVIEW_MAX_DAYS looking for one, showing a nonsensical
  // date range instead of the empty preview this actually is.
  if (extendMode && deliveryDayKeys.size === 0) return [];

  let cursor = DateUtil.addDaysToDateStr(todayStr, 1);
  const preview: PlanPreviewDay[] = [];
  let realDayCount = 0;
  const maxIterations = extendMode ? PLAN_PREVIEW_MAX_DAYS : plan.durationDays;
  for (let i = 0; i < maxIterations; i++) {
    const key = PlanScheduleUtil.resolveKey(plan, {
      dateStr: cursor,
      relativeCounter: 1,
    });
    const day =
      'weekNumber' in key
        ? byWeekWeekday.get(`${key.weekNumber}-${key.weekday}`)
        : undefined;
    const isRealDay =
      'weekNumber' in key &&
      deliveryDayKeys.has(`${key.weekNumber}-${key.weekday}`);
    preview.push({
      date: cursor,
      meals: (day?.slots ?? []).map((slot) => ({
        slotType: slot.slotType,
        mealId: slot.meal?.id ?? null,
        name: slot.meal?.name ?? null,
        imageUrl: slot.meal?.imageUrl ?? null,
      })),
    });
    cursor = DateUtil.addDaysToDateStr(cursor, 1);
    if (isRealDay) realDayCount++;
    if (extendMode && realDayCount >= plan.durationDays) break;
  }
  return preview;
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
  /** This day's prep/customization note, if the customer set one — surfaced
   * here so the account page can pre-fill it when the day card reopens. */
  note: string | null;
  /** Too close to delivery to skip/pause/override — the notice window has
   * already passed. The frontend should hide those controls and explain
   * why instead of letting the customer submit and hit a rejection. */
  locked: boolean;
  /** Set only when this day was skipped by a tenant-declared disruption
   * (never the customer's own skip/pause) — shown instead of the plain
   * "Skipped" label so the customer understands why. */
  disruptionReason: string | null;
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
    skips: { dateFrom: string; dateTo: string; reason: string | null }[];
    dayOverrides: {
      date: string;
      addressId: string | null;
      deliverySlotId: string | null;
      note: string | null;
    }[];
    plan: {
      schedulingMode: SubscriptionPlanSchedulingMode;
      durationDays: number;
      weekCount: number | null;
      scheduleAnchorDate: string | null;
      days: {
        dayNumber: number | null;
        weekNumber: number | null;
        weekday: number | null;
        slots: {
          slotType: string;
          meal: { id: string; name: string; imageUrl: string | null } | null;
        }[];
      }[];
    };
  },
  timezone: string,
  earliestEditableDateStr: string,
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
  const daysByWeekWeekday = new Map(
    subscription.plan.days.map((d) => [`${d.weekNumber}-${d.weekday}`, d]),
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
    const locked = cursor < earliestEditableDateStr;

    if (skip) {
      preview.push({
        date: cursor,
        skipped: true,
        meals: [],
        addressId,
        deliverySlotId,
        isOverridden: Boolean(override),
        note: override?.note ?? null,
        locked,
        disruptionReason: skip.reason,
      });
    } else {
      const key = PlanScheduleUtil.resolveKey(subscription.plan, {
        dateStr: cursor,
        relativeCounter: counter,
      });
      const planDay =
        'dayNumber' in key
          ? daysByNumber.get(key.dayNumber)
          : daysByWeekWeekday.get(`${key.weekNumber}-${key.weekday}`);
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
        note: override?.note ?? null,
        locked,
        disruptionReason: null,
      });
      counter += 1;
    }
    cursor = DateUtil.addDaysToDateStr(cursor, 1);
  }
  return preview;
}
