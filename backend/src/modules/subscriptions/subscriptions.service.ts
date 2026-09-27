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
import { UsersRepository } from '../users/users.repository';
import { RazorpayClientService } from '../../shared-modules/razorpay/razorpay-client.service';
import { PaginationService } from '../../common/services/pagination.service';
import { DateUtil } from '../../common/utils/date.util';
import { AnalyticsRangeUtil } from '../../common/utils/analytics-range.util';
import {
  closedDatesAffecting,
  subscriptionClosedDateSet,
} from '../../common/utils/closed-dates.util';
import {
  buildPlanCalendar,
  buildWeeklyMealsByDate,
} from '../../common/utils/plan-calendar.util';
import {
  PlanScheduleKey,
  PlanScheduleUtil,
} from '../../common/utils/plan-schedule.util';
import {
  computeCandidateDeliveryDates,
  computeSelectionWindow,
  isManualSelectionPlan,
  validateSelectedDates,
} from '../../common/utils/plan-date-selection.util';
import { buildSubscriptionCalendarDays } from '../../common/utils/subscription-calendar.util';
import { buildUpcomingPreview } from '../../common/utils/subscription-upcoming.util';
import { projectHolidayReplacements } from '../../common/utils/subscription-holiday-projection.util';
import { deliversOn } from '../../common/utils/subscription-prep.util';
import {
  SubscriptionOffDayHandling,
  SubscriptionPlanSchedulingMode,
  SubscriptionPlanViewMode,
} from '../../generated/prisma';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpsertPlanDaysDto } from './dto/upsert-plan-days.dto';
import { PublishPlanDto } from './dto/publish-plan.dto';
import { QueryAdminPlansDto } from './dto/query-admin-plans.dto';
import { QueryAdminSubscriptionsDto } from './dto/query-admin-subscriptions.dto';
import { QuerySubscriptionAnalyticsDto } from './dto/query-subscription-analytics.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { CreateManualSubscriptionDto } from './dto/create-manual-subscription.dto';
import { VerifyPlanPaymentDto } from './dto/verify-plan-payment.dto';
import { SkipDayDto } from './dto/skip-day.dto';
import { PauseDto } from './dto/pause.dto';
import { SetDayOverrideDto } from './dto/set-day-override.dto';
import { UpdateSubscriptionSettingsDto } from './dto/update-subscription-settings.dto';
import { TenantLimitsService } from '../tenant-limits/tenant-limits.service';
import { defaultSubscriptionSettings } from '../../common/constants/tenant-default-content';
import { SubscriptionMaterializationService } from './subscription-materialization.service';
import { SubscriptionBankingService } from './subscription-banking.service';
import { RefundsRepository } from '../../shared-modules/refunds/refunds.repository';
import { RAZORPAY_REFUNDS_FEATURE_KEY } from '../../shared-modules/refunds/refunds.constants';
import { CancelRefundDto } from '../../shared-modules/refunds/dto/cancel-refund.dto';
import {
  PaymentMethod,
  Refund,
  RefundMethod,
  Role,
  Subscription,
} from '../../generated/prisma';

// SUPER_ADMIN platform-level kill switch — separate from the tenant's own
// SubscriptionSettings.isEnabled self-service toggle. Both must be on for
// the storefront to show plans; this one only SUPER_ADMIN controls.
const SUBSCRIPTIONS_FEATURE_KEY = 'subscriptions';
const CANCEL_FEATURE_KEY = 'subscription-self-cancel';
// SUPER_ADMIN opt-in — presence of the grant HIDES delivery-time selection
// (both at signup and per-day overrides) rather than unlocking it, so a
// brand-new tenant with no grant row keeps today's working behavior instead
// of silently losing the time picker the moment this feature key exists.
const TIME_LOCK_FEATURE_KEY = 'subscription-plan-time-lock';
// SUPER_ADMIN opt-ins for the calendar plan view and (on top of it) customer
// date selection — see getCalendarEntitlements for the dependency rule.
const PLAN_CALENDAR_FEATURE_KEY = 'plan-calendar-view';
const DATE_SELECTION_FEATURE_KEY = 'delivery-date-selection';

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
    private readonly refundsRepo: RefundsRepository,
    private readonly usersRepo: UsersRepository,
    private readonly bankingService: SubscriptionBankingService,
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
    const [settings, entitlements] = await Promise.all([
      this.subscriptionsRepo.findSettings(tenantId),
      this.getCalendarEntitlements(tenantId),
    ]);
    return {
      ...(settings ?? {
        isEnabled: true,
        isAcceptingNewSubscriptions: true,
        closureReason: null,
        noticeHoursBeforeDelivery: 24,
        startDateLeadDays: 1,
        showOnHomepage: true,
        ...defaultSubscriptionSettings(),
        planViewMode: SubscriptionPlanViewMode.ACCORDION,
        dateSelectionEnabled: false,
        selectionFlexibilityDays: 7,
        allowDateChangeAfterPurchase: false,
      }),
      // Tells the admin UI which of the calendar controls this tenant may
      // use at all, so it can hide the rest instead of erroring on save.
      calendarViewGranted: entitlements.calendarView,
      dateSelectionGranted: entitlements.dateSelection,
    };
  }

  async updateSettings(tenantId: string, dto: UpdateSubscriptionSettingsDto) {
    const entitlements = await this.getCalendarEntitlements(tenantId);
    const usesCalendar =
      dto.planViewMode !== undefined &&
      dto.planViewMode !== SubscriptionPlanViewMode.ACCORDION;
    const usesDateSelection =
      dto.dateSelectionEnabled === true ||
      dto.allowDateChangeAfterPurchase === true;
    if (usesCalendar && !entitlements.calendarView) {
      throw new ForbiddenException(
        'The calendar plan view is not enabled for your account.',
      );
    }
    if (usesDateSelection && !entitlements.dateSelection) {
      throw new ForbiddenException(
        'Delivery date selection is not enabled for your account.',
      );
    }
    const saved = await this.subscriptionsRepo.upsertSettings(tenantId, dto);
    // Same shape as getSettings(), so the admin UI can put the response
    // straight back into its cache without losing the grant flags.
    return {
      ...saved,
      calendarViewGranted: entitlements.calendarView,
      dateSelectionGranted: entitlements.dateSelection,
    };
  }

  /** delivery-date-selection is a calendar-driven UI, so it only counts as
   * granted when plan-calendar-view is granted too — a stale grant row for
   * the child is never enough on its own. */
  private async getCalendarEntitlements(tenantId: string) {
    const [calendarView, dateSelectionGranted] = await Promise.all([
      this.featuresService.hasFeature(tenantId, PLAN_CALENDAR_FEATURE_KEY),
      this.featuresService.hasFeature(tenantId, DATE_SELECTION_FEATURE_KEY),
    ]);
    return {
      calendarView,
      dateSelection: calendarView && dateSelectionGranted,
    };
  }

  /** Public: the flags/copy the storefront home page + /plans page need. */
  async getPublicSettings(tenantId: string) {
    const [settings, featureGranted, entitlements] = await Promise.all([
      this.subscriptionsRepo.findSettings(tenantId),
      this.featuresService.hasFeature(tenantId, SUBSCRIPTIONS_FEATURE_KEY),
      this.getCalendarEntitlements(tenantId),
    ]);
    const defaults = defaultSubscriptionSettings();
    return {
      // Downgrade to what the tenant is actually entitled to — a stored
      // CALENDAR/BOTH (or a selection switch) never reaches the storefront
      // once SUPER_ADMIN revokes the grant.
      planViewMode: entitlements.calendarView
        ? (settings?.planViewMode ?? SubscriptionPlanViewMode.ACCORDION)
        : SubscriptionPlanViewMode.ACCORDION,
      dateSelectionEnabled:
        entitlements.dateSelection && (settings?.dateSelectionEnabled ?? false),
      selectionFlexibilityDays: settings?.selectionFlexibilityDays ?? 7,
      allowDateChangeAfterPurchase:
        entitlements.dateSelection &&
        (settings?.allowDateChangeAfterPurchase ?? false),
      isEnabled: (settings?.isEnabled ?? true) && featureGranted,
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
      // Non-null assert: a materialized subscription order always belongs
      // to a real subscriber account — userId is only ever null for a
      // DINE_IN/TAKEAWAY guest walk-in, which materialization never creates.
      customerName:
        `${order.user!.firstName} ${order.user!.lastName ?? ''}`.trim(),
      customerEmail: order.user!.email,
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
    const featureGranted = await this.featuresService.hasFeature(
      tenantId,
      SUBSCRIPTIONS_FEATURE_KEY,
    );
    if (!featureGranted) return [];

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
    const featureGranted = await this.featuresService.hasFeature(
      tenantId,
      SUBSCRIPTIONS_FEATURE_KEY,
    );
    if (!featureGranted) throw new NotFoundException('Plan not found');

    const plan = await this.subscriptionsRepo.findPublishedPlanById(
      tenantId,
      id,
    );
    if (!plan) throw new NotFoundException('Plan not found');
    const [
      timeLocked,
      promoMap,
      timezone,
      settings,
      entitlements,
      closedDates,
      bonusDays,
    ] = await Promise.all([
      this.featuresService.hasFeature(tenantId, TIME_LOCK_FEATURE_KEY),
      this.promotionsService.getActiveScheduledDiscountsForPlans(tenantId, [
        plan.id,
      ]),
      this.getTenantTimezone(tenantId),
      this.subscriptionsRepo.findSettings(tenantId),
      this.getCalendarEntitlements(tenantId),
      this.settingsRepo.findClosedDates(tenantId),
      this.promotionsService.getApplicablePlanBonusDays(
        tenantId,
        plan.id,
        plan.durationDays,
      ),
    ]);

    // The month calendar is only built for tenants that are entitled to it
    // AND chose CALENDAR/BOTH — everyone else keeps today's exact payload.
    const viewMode = entitlements.calendarView
      ? (settings?.planViewMode ?? SubscriptionPlanViewMode.ACCORDION)
      : SubscriptionPlanViewMode.ACCORDION;
    const usesCalendar = viewMode !== SubscriptionPlanViewMode.ACCORDION;
    const startDateStr = DateUtil.addDaysToDateStr(
      DateUtil.getTenantNow(timezone).dateStr,
      settings?.startDateLeadDays ?? 1,
    );
    const subscriptionClosedDates = closedDatesAffecting(
      closedDates,
      'SUBSCRIPTIONS',
    );
    const calendar = usesCalendar
      ? buildPlanCalendar(plan, startDateStr, subscriptionClosedDates)
      : null;

    // Only surfaced pre-purchase when the tenant is entitled AND opted in —
    // subscribe() re-derives and re-validates the exact same window rather
    // than trusting anything the client echoes back.
    const durationDaysSnapshot = plan.durationDays + bonusDays;
    const dateSelectionActive =
      entitlements.dateSelection && (settings?.dateSelectionEnabled ?? false);
    const weeklyPlan =
      plan.schedulingMode === SubscriptionPlanSchedulingMode.WEEKLY_FIXED;
    const deliveryDayKeys =
      dateSelectionActive && weeklyPlan
        ? await this.subscriptionsRepo.findPlanDeliveryDayKeys(plan.id)
        : null;
    const selectionWindow = dateSelectionActive
      ? computeSelectionWindow(
          plan,
          deliveryDayKeys,
          startDateStr,
          durationDaysSnapshot,
          settings?.selectionFlexibilityDays ?? 7,
          new Map(
            subscriptionClosedDates.map((c) => [
              c.date,
              { name: c.name, note: c.note },
            ]),
          ),
        )
      : null;
    const candidates = selectionWindow?.candidates ?? [];
    const dateSelection = selectionWindow
      ? {
          requiredCount: durationDaysSnapshot,
          candidates,
          unavailable: selectionWindow.unavailable,
          // Short plans: the customer actively picks every date. Long plans:
          // everything is pre-selected and they only adjust exceptions.
          manualSelection: isManualSelectionPlan(durationDaysSnapshot),
          mealsByDate: weeklyPlan
            ? buildWeeklyMealsByDate(plan, candidates)
            : null,
        }
      : null;

    return {
      ...plan,
      timeSelectionEnabled: !timeLocked,
      activePromotion: promoMap.get(plan.id) ?? null,
      previewWindow:
        plan.schedulingMode === SubscriptionPlanSchedulingMode.WEEKLY_FIXED
          ? buildPlanPreviewWindow(plan, timezone)
          : null,
      viewMode,
      calendar,
      dateSelection,
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
    let timezone = 'Asia/Kolkata';
    if (plan.schedulingMode === SubscriptionPlanSchedulingMode.WEEKLY_FIXED) {
      timezone = await this.getTenantTimezone(tenantId);
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

    const [day, activeCount, prepCandidates] = await Promise.all([
      'dayNumber' in key
        ? this.subscriptionsRepo.findPlanDayWithSlots(planId, key.dayNumber)
        : this.subscriptionsRepo.findPlanDayByWeekAndWeekday(
            planId,
            key.weekNumber,
            key.weekday,
          ),
      // RELATIVE_DAY's projection stays the hypothetical "if everyone hit
      // day N" count — there's no single shared date to check against.
      todayStr
        ? Promise.resolve(0)
        : this.subscriptionsRepo.countActiveSubscriptionsForPlan(
            tenantId,
            planId,
          ),
      // WEEKLY_FIXED: every subscriber shares today's real date, so count
      // only those actually delivering today — started, not yet ended, not
      // skipped/paused, and (date selection) today is one of their dates.
      todayStr
        ? this.subscriptionsRepo.findActiveSubscriptionsForPrep(
            tenantId,
            planId,
            todayStr,
          )
        : Promise.resolve([]),
    ]);
    // A weekday with no slots is an off day — nobody is cooked for.
    const isOffDay = todayStr !== undefined && (day?.slots ?? []).length === 0;
    const subscriberCount = !todayStr
      ? activeCount
      : isOffDay
        ? 0
        : prepCandidates.filter((s) => deliversOn(s, todayStr, timezone))
            .length;

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
    const durationDaysSnapshot = plan.durationDays + bonusDays;

    // Delivery date selection — gated the same way getPublicSettings() gates
    // what the storefront is even allowed to show, so a request forged
    // straight against the API can't use it just because the DTO field
    // exists on the wire.
    const entitlements = await this.getCalendarEntitlements(tenantId);
    const dateSelectionActive =
      entitlements.dateSelection && (settings?.dateSelectionEnabled ?? false);
    let sortedDeliveryDates: string[] | undefined;
    if (dateSelectionActive || dto.deliveryDates) {
      if (!dateSelectionActive) {
        throw new BadRequestException(
          'Choosing delivery dates is not available for this plan.',
        );
      }
      if (!dto.deliveryDates || dto.deliveryDates.length === 0) {
        throw new BadRequestException(
          'Choose your delivery dates to subscribe.',
        );
      }
      const timezone = await this.getTenantTimezone(tenantId);
      const startDateStr = DateUtil.addDaysToDateStr(
        DateUtil.getTenantNow(timezone).dateStr,
        settings?.startDateLeadDays ?? 1,
      );
      const deliveryDayKeys =
        plan.schedulingMode === SubscriptionPlanSchedulingMode.WEEKLY_FIXED
          ? await this.subscriptionsRepo.findPlanDeliveryDayKeys(plan.id)
          : null;
      const closedDates = closedDatesAffecting(
        await this.settingsRepo.findClosedDates(tenantId),
        'SUBSCRIPTIONS',
      );
      const candidates = computeCandidateDeliveryDates(
        plan,
        deliveryDayKeys,
        startDateStr,
        durationDaysSnapshot,
        settings?.selectionFlexibilityDays ?? 7,
        new Set(closedDates.map((c) => c.date)),
      );
      const validation = validateSelectedDates(
        dto.deliveryDates,
        candidates,
        durationDaysSnapshot,
      );
      if (!validation.ok) throw new BadRequestException(validation.message);
      sortedDeliveryDates = validation.dates;
    }

    const subscription = await this.subscriptionsRepo.createSubscription({
      tenantId,
      userId,
      planId: plan.id,
      addressId: dto.addressId,
      deliverySlotId: dto.deliverySlotId,
      priceInPaiseSnapshot: amountInPaise,
      durationDaysSnapshot,
      planNameSnapshot: plan.name,
      couponCode: resolvedCouponCode,
      bonusDaysGranted: bonusDays,
      usesDateSelection: sortedDeliveryDates !== undefined,
    });

    if (sortedDeliveryDates) {
      await this.subscriptionsRepo.createScheduledDates(
        subscription.id,
        sortedDeliveryDates.map((date, i) => ({ date, sequence: i + 1 })),
      );
    }

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

    await this.activateSubscriptionNow(tenantId, subscription);

    return { confirmed: true };
  }

  /**
   * Shared by verifyPayment() (real Razorpay payment confirmed) and
   * createManual()/markPaidManually() (admin cash/UPI path) — the actual
   * "flip PENDING_PAYMENT to ACTIVE" logic: computes startDate/cycleEnd and
   * inline-materializes today if the tenant's startDateLeadDays is 0 (the
   * nightly cron already ran/won't run again today). Extracted so both
   * payment paths can never drift on how a subscription actually activates.
   */
  private async activateSubscriptionNow(
    tenantId: string,
    subscription: {
      id: string;
      planId: string;
      durationDaysSnapshot: number;
      usesDateSelection: boolean;
    },
  ): Promise<void> {
    let startDate: Date;
    let cycleEnd: Date;
    if (subscription.usesDateSelection) {
      // The dates were fixed at signup (see subscribe()'s validation against
      // the selection window) — activation just reads them back rather than
      // recomputing anything, so a delayed payment can never silently pick
      // different dates than what the customer actually chose.
      const scheduledDates = await this.subscriptionsRepo.findScheduledDates(
        subscription.id,
      );
      startDate = new Date(`${scheduledDates[0].date}T00:00:00.000Z`);
      cycleEnd = new Date(`${scheduledDates.at(-1)!.date}T00:00:00.000Z`);
    } else {
      // Days out from today, tenant-controlled (SubscriptionSettings.
      // startDateLeadDays, default 1 — matches the platform's original
      // always-tomorrow behavior).
      const settings = await this.subscriptionsRepo.findSettings(tenantId);
      const startDateLeadDays = settings?.startDateLeadDays ?? 1;
      startDate = DateUtil.addDays(DateUtil.now(), startDateLeadDays);
      cycleEnd = await this.computeInitialCycleEnd(
        tenantId,
        subscription.planId,
        startDate,
        subscription.durationDaysSnapshot,
      );
    }
    await this.subscriptionsRepo.activateSubscription(subscription.id, {
      startDate,
      cycleEnd,
    });

    // Same-day delivery: startDate already being "today or earlier" (a
    // startDateLeadDays of 0, or a delayed payment that let a chosen
    // delivery date arrive before the nightly cron next runs) means the
    // cron won't reach it in time — materialize inline instead.
    const timezone = await this.getTenantTimezone(tenantId);
    const todayStr = DateUtil.getTenantNow(timezone).dateStr;
    if (todayStr >= DateUtil.toTenantDateStr(startDate, timezone)) {
      const materializable =
        await this.subscriptionsRepo.findSubscriptionForMaterialization(
          subscription.id,
        );
      if (materializable) {
        await this.materializationService.materializeOne(materializable);
      }
    }
  }

  // ─── Admin: manual (cash/UPI) signup ─────────────────────

  /**
   * Admin phone-signup path — same validation/pricing as a real self-signup
   * (plan availability, subscriber cap, coupon, time-lock), but for a
   * chosen existing customer, no Razorpay involved, settled by cash/UPI.
   * Lands PENDING_PAYMENT, same as a fresh customer signup — a separate
   * markPaidManually() call (a distinct permission) is what actually
   * activates it, mirroring the order manual-create/mark-paid split.
   */
  async createManual(
    tenantId: string,
    staffUserId: string,
    dto: CreateManualSubscriptionDto,
  ): Promise<{ subscription: Subscription }> {
    const customer = await this.usersRepo.findById(
      dto.customerUserId,
      tenantId,
    );
    if (!customer || customer.role !== Role.CUSTOMER) {
      throw new NotFoundException('Customer not found');
    }

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

    await this.tenantLimits.assertSubscriberAllowed(tenantId);

    const plan = await this.subscriptionsRepo.findPlanForSubscribe(
      tenantId,
      dto.planId,
    );
    if (!plan) throw new NotFoundException('Plan not found or not available');

    await this.addressesService.findOne(
      tenantId,
      dto.customerUserId,
      dto.addressId,
    );

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
        dto.customerUserId,
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
      userId: dto.customerUserId,
      planId: plan.id,
      addressId: dto.addressId,
      deliverySlotId: dto.deliverySlotId,
      priceInPaiseSnapshot: amountInPaise,
      durationDaysSnapshot: plan.durationDays + bonusDays,
      planNameSnapshot: plan.name,
      couponCode: resolvedCouponCode,
      bonusDaysGranted: bonusDays,
      paymentMethod: dto.paymentMethod as PaymentMethod,
      createdByUserId: staffUserId,
    });

    if (couponId && resolvedCouponCode) {
      await this.promotionsService.recordPlanCouponRedemption(
        tenantId,
        couponId,
        dto.customerUserId,
        subscription.id,
      );
    }

    return { subscription };
  }

  /** Confirms cash/UPI was actually received for a manually-signed-up
   * subscription — a distinct permission from creating it (see
   * createManual). Idempotent: a subscription that's already past
   * PENDING_PAYMENT (activated, or since cancelled/expired) is a no-op. */
  async markPaidManually(tenantId: string, id: string): Promise<Subscription> {
    const subscription = await this.subscriptionsRepo.findSubscriptionById(
      tenantId,
      id,
    );
    if (!subscription) throw new NotFoundException('Subscription not found');
    if (subscription.paymentMethod === PaymentMethod.RAZORPAY) {
      throw new BadRequestException(
        'This subscription was signed up via Razorpay — payment is confirmed through the payment verification flow, not this endpoint.',
      );
    }
    if (subscription.status !== 'PENDING_PAYMENT') {
      return subscription;
    }
    await this.activateSubscriptionNow(tenantId, subscription);
    const updated = await this.subscriptionsRepo.findSubscriptionById(
      tenantId,
      id,
    );
    return updated!;
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
    const [
      addresses,
      deliverySlots,
      canCancel,
      timeLocked,
      earliest,
      settings,
      entitlements,
      closedDates,
    ] = await Promise.all([
      this.addressesService.findAll(tenantId, userId),
      this.settingsRepo.findActiveDeliverySlots(tenantId),
      this.featuresService.hasFeature(tenantId, CANCEL_FEATURE_KEY),
      this.featuresService.hasFeature(tenantId, TIME_LOCK_FEATURE_KEY),
      this.getEarliestEditableDate(tenantId, timezone),
      this.subscriptionsRepo.findSettings(tenantId),
      this.getCalendarEntitlements(tenantId),
      this.settingsRepo.findClosedDates(tenantId),
    ]);
    const canOverrideTime = !timeLocked;
    const subscriptionClosures = closedDatesAffecting(
      closedDates,
      'SUBSCRIPTIONS',
    );
    const todayStr = DateUtil.getTenantNow(timezone).dateStr;
    const startDateStr = subscription.startDate
      ? DateUtil.toTenantDateStr(subscription.startDate, timezone)
      : null;
    const cycleEndStr = subscription.cycleEnd
      ? DateUtil.toTenantDateStr(subscription.cycleEnd, timezone)
      : null;
    // Display only — the materializer still banks each holiday's day on the
    // day itself; this just shows the customer where it will land.
    const projection =
      startDateStr && cycleEndStr && subscription.status === 'ACTIVE'
        ? projectHolidayReplacements(
            subscription,
            todayStr,
            startDateStr,
            cycleEndStr,
            subscriptionClosures,
          )
        : undefined;
    const upcoming = buildUpcomingPreview(
      subscription,
      todayStr,
      timezone,
      earliest.dateStr,
      subscriptionClosures,
      projection,
    );

    // Same downgrade rule as the storefront's findPublishedPlan — a stored
    // CALENDAR/BOTH never reaches a tenant that lost the grant.
    const viewMode = entitlements.calendarView
      ? (settings?.planViewMode ?? SubscriptionPlanViewMode.ACCORDION)
      : SubscriptionPlanViewMode.ACCORDION;
    // "Move to another date" needs both the grant AND the tenant's own
    // switch — and only ever applies to a subscriber who actually used date
    // selection at signup (a contiguous subscriber has no scheduled rows to
    // move in the first place).
    const canMoveDates =
      subscription.usesDateSelection &&
      entitlements.dateSelection &&
      (settings?.allowDateChangeAfterPurchase ?? false);
    const calendar =
      startDateStr && cycleEndStr
        ? buildSubscriptionCalendarDays(
            subscription,
            startDateStr,
            cycleEndStr,
            todayStr,
            earliest.dateStr,
            subscriptionClosures,
            projection,
          )
        : [];

    return {
      ...subscription,
      upcoming,
      addresses,
      deliverySlots,
      canCancel,
      canOverrideTime,
      earliestEditableDate: earliest.dateStr,
      viewMode,
      canMoveDates,
      calendar,
    };
  }

  /** Valid dates the customer could move `date` to — every candidate
   * delivery day within the plan's original selection window that isn't
   * already scheduled, excluding `date` itself. Reuses the exact same
   * window math the checkout picker used, anchored at the subscription's
   * own startDate so a move can never land the subscriber somewhere their
   * original signup window wouldn't have offered. */
  async getMoveCandidates(
    tenantId: string,
    userId: string,
    subscriptionId: string,
    date: string,
  ) {
    const subscription = await this.getOwnedActiveSubscription(
      tenantId,
      userId,
      subscriptionId,
    );
    await this.assertCanMoveDates(tenantId, subscription);
    const timezone = await this.getTenantTimezone(tenantId);
    await this.assertWithinNoticeWindow(tenantId, date);

    const scheduled = await this.subscriptionsRepo.findScheduledDate(
      subscription.id,
      date,
    );
    if (!scheduled) {
      throw new BadRequestException('That date is not part of this plan.');
    }

    const [plan, settings, closedDates, allScheduled] = await Promise.all([
      this.subscriptionsRepo.findPlanScheduleConfig(subscription.planId),
      this.subscriptionsRepo.findSettings(tenantId),
      this.settingsRepo.findClosedDates(tenantId),
      this.subscriptionsRepo.findScheduledDates(subscription.id),
    ]);
    if (!plan) throw new NotFoundException('Plan not found');

    const startDateStr = DateUtil.toTenantDateStr(
      subscription.startDate!,
      timezone,
    );
    const deliveryDayKeys =
      plan.schedulingMode === SubscriptionPlanSchedulingMode.WEEKLY_FIXED
        ? await this.subscriptionsRepo.findPlanDeliveryDayKeys(
            subscription.planId,
          )
        : null;
    const candidates = computeCandidateDeliveryDates(
      plan,
      deliveryDayKeys,
      startDateStr,
      subscription.durationDaysSnapshot,
      settings?.selectionFlexibilityDays ?? 7,
      new Set(
        closedDatesAffecting(closedDates, 'SUBSCRIPTIONS').map((c) => c.date),
      ),
    );
    const alreadyScheduled = new Set(allScheduled.map((s) => s.date));
    const { dateStr: earliestDateStr } = await this.getEarliestEditableDate(
      tenantId,
      timezone,
    );
    return candidates.filter(
      (d) => d !== date && !alreadyScheduled.has(d) && d >= earliestDateStr,
    );
  }

  /** Moves one already-scheduled delivery to another date — an in-place
   * relocation (see SubscriptionsRepository.updateScheduledDateDate), not a
   * skip: nothing is banked, the total delivery count is unchanged. Updates
   * the subscription's own startDate/cycleEnd too if the move happened to
   * touch either edge. */
  async moveDeliveryDate(
    tenantId: string,
    userId: string,
    subscriptionId: string,
    date: string,
    newDate: string,
  ) {
    const subscription = await this.getOwnedActiveSubscription(
      tenantId,
      userId,
      subscriptionId,
    );
    await this.assertCanMoveDates(tenantId, subscription);
    await this.assertWithinNoticeWindow(tenantId, date);
    await this.assertWithinNoticeWindow(tenantId, newDate);

    const candidates = await this.getMoveCandidates(
      tenantId,
      userId,
      subscriptionId,
      date,
    );
    if (!candidates.includes(newDate)) {
      throw new BadRequestException(
        'That date is not available to move this delivery to.',
      );
    }

    await this.subscriptionsRepo.updateScheduledDateDate(
      subscription.id,
      date,
      newDate,
    );
    const allScheduled = await this.subscriptionsRepo.findScheduledDates(
      subscription.id,
    );
    const sortedDates = allScheduled.map((s) => s.date).sort();
    await this.subscriptionsRepo.activateSubscription(subscription.id, {
      startDate: new Date(`${sortedDates[0]}T00:00:00.000Z`),
      cycleEnd: new Date(`${sortedDates.at(-1)}T00:00:00.000Z`),
    });
    return this.findMySubscription(tenantId, userId, subscriptionId);
  }

  private async assertCanMoveDates(
    tenantId: string,
    subscription: { usesDateSelection: boolean },
  ): Promise<void> {
    if (!subscription.usesDateSelection) {
      throw new BadRequestException(
        'This subscription does not use chosen delivery dates.',
      );
    }
    const entitlements = await this.getCalendarEntitlements(tenantId);
    const settings = await this.subscriptionsRepo.findSettings(tenantId);
    if (
      !entitlements.dateSelection ||
      !settings?.allowDateChangeAfterPurchase
    ) {
      throw new ForbiddenException(
        'Moving a delivery to another date is not enabled for this business.',
      );
    }
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

  /**
   * Admin dashboard summary for the new Subscriptions → Analytics tab —
   * new-subscriber counts, active-subscriber count, gross/refunded/net
   * revenue, a revenue trend, and a per-plan breakdown, all scoped to
   * `query` (a `days` preset, default 14, or an explicit `from`/`to`
   * custom range — `from`/`to` win if both are given — plus an optional
   * `planId` to scope every figure to one plan). "Today" and "currently
   * active" are always fixed regardless of that range — headline KPIs,
   * not part of what's being filtered — same convention as
   * OrdersService.getOverview(), and reuses its exact date-range/bucketing
   * math via AnalyticsRangeUtil rather than a second hand-rolled copy.
   */
  /** Backs the closed-dates admin card's "N subscribers affected" warning —
   * see SubscriptionsRepository.countActiveSubscriptionsAffectedByDate for
   * exactly what counts as "affected". */
  countSubscribersAffectedByDate(
    tenantId: string,
    date: string,
  ): Promise<{ count: number }> {
    return this.subscriptionsRepo
      .countActiveSubscriptionsAffectedByDate(tenantId, date)
      .then((count) => ({ count }));
  }

  async getAnalytics(tenantId: string, query: QuerySubscriptionAnalyticsDto) {
    const now = DateUtil.now();
    const timezone = await this.getTenantTimezone(tenantId);
    const { queryStart, queryEnd, bucketStartStr, bucketEndStr } =
      AnalyticsRangeUtil.resolveRange(query, now, timezone);

    const [
      rangeSubscriptions,
      todaySubscriptions,
      activeSubscribers,
      refunds,
      planBreakdown,
    ] = await Promise.all([
      this.subscriptionsRepo.findRealSubscriptionsInRange(
        tenantId,
        queryStart,
        queryEnd,
        query.planId,
      ),
      this.subscriptionsRepo.findRealSubscriptionsInRange(
        tenantId,
        DateUtil.addDays(now, -1),
        now,
        query.planId,
      ),
      this.subscriptionsRepo.countActiveSubscribers(tenantId, query.planId),
      this.subscriptionsRepo.findSubscriptionRefundsInRange(
        tenantId,
        queryStart,
        queryEnd,
      ),
      this.subscriptionsRepo.getPlanBreakdownInRange(
        tenantId,
        queryStart,
        queryEnd,
      ),
    ]);

    const gross = AnalyticsRangeUtil.sumInWindow(
      rangeSubscriptions,
      queryStart,
      (s) => s.priceInPaiseSnapshot,
    );
    const refunded = AnalyticsRangeUtil.sumInWindow(
      refunds,
      queryStart,
      (r) => r.netRefundInPaise,
    );

    return {
      newSubscribersToday: todaySubscriptions.length,
      newSubscribersInRange: gross.count,
      activeSubscribers,
      grossRevenueInPaise: gross.valueInPaise,
      refundedInPaise: refunded.valueInPaise,
      netRevenueInPaise: gross.valueInPaise - refunded.valueInPaise,
      revenueTrend: AnalyticsRangeUtil.bucketByDay(
        rangeSubscriptions,
        timezone,
        bucketStartStr,
        bucketEndStr,
        (s) => s.priceInPaiseSnapshot,
      ),
      planBreakdown: query.planId
        ? planBreakdown.filter((p) => p.planId === query.planId)
        : planBreakdown,
    };
  }

  /** Drill-down list behind the "expiring in N days" tile — every currently
   * ACTIVE subscription whose cycleEnd falls in [today, today+withinDays]. */
  async getExpiringSoon(tenantId: string, withinDays: number) {
    const timezone = await this.getTenantTimezone(tenantId);
    const { dateStr: todayStr } = DateUtil.getTenantNow(timezone);
    const untilStr = DateUtil.addDaysToDateStr(todayStr, withinDays);

    const subscriptions = await this.subscriptionsRepo.findExpiringSoon(
      tenantId,
      todayStr,
      untilStr,
    );
    return {
      count: subscriptions.length,
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        planName: s.planNameSnapshot,
        cycleEnd: s.cycleEnd,
        user: s.user,
      })),
    };
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
    return this.applySkipDay(tenantId, subscription, dto);
  }

  /** Admin equivalent of skipDay() — same effect, but for any subscriber in
   * this tenant (not just the caller's own), for when a customer calls in
   * and asks the business to skip a day on their behalf. */
  async skipDayAdmin(tenantId: string, id: string, dto: SkipDayDto) {
    const subscription = await this.getTenantActiveSubscription(tenantId, id);
    return this.applySkipDay(tenantId, subscription, dto);
  }

  private async applySkipDay(
    tenantId: string,
    subscription: Subscription,
    dto: SkipDayDto,
  ) {
    await this.assertWithinNoticeWindow(tenantId, dto.date);
    // Nothing is delivered on a tenant closure, so there is nothing to skip —
    // and crediting a banked day for it would hand out a free extra delivery
    // on plans that do not compensate closures.
    const closedDates = await this.settingsRepo.findClosedDates(tenantId);
    if (subscriptionClosedDateSet(closedDates).has(dto.date)) {
      throw new BadRequestException(
        'The kitchen is closed on that date, so there is no delivery to skip.',
      );
    }
    await this.subscriptionsRepo.createSkip({
      subscriptionId: subscription.id,
      dateFrom: dto.date,
      dateTo: dto.date,
      bankedDays: 1,
    });
    const newCycleEnd = await this.bankingService.bankExtraDays(
      tenantId,
      { ...subscription, cycleEnd: subscription.cycleEnd as Date },
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
    return this.applyPause(tenantId, subscription, dto);
  }

  /** Admin equivalent of pause() — see skipDayAdmin(). */
  async pauseAdmin(tenantId: string, id: string, dto: PauseDto) {
    const subscription = await this.getTenantActiveSubscription(tenantId, id);
    return this.applyPause(tenantId, subscription, dto);
  }

  private async applyPause(
    tenantId: string,
    subscription: Subscription,
    dto: PauseDto,
  ) {
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
    const newCycleEnd = await this.bankingService.bankExtraDays(
      tenantId,
      { ...subscription, cycleEnd: subscription.cycleEnd as Date },
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
    return this.applyDayOverride(tenantId, subscription, dto);
  }

  /** Admin equivalent of setDayOverride() — see skipDayAdmin(). Address/
   * slot ownership is still checked against the subscription's own
   * customer (subscription.userId), never the acting staff member. */
  async setDayOverrideAdmin(
    tenantId: string,
    id: string,
    dto: SetDayOverrideDto,
  ) {
    const subscription = await this.getTenantActiveSubscription(tenantId, id);
    return this.applyDayOverride(tenantId, subscription, dto);
  }

  private async applyDayOverride(
    tenantId: string,
    subscription: Subscription,
    dto: SetDayOverrideDto,
  ) {
    await this.assertWithinNoticeWindow(tenantId, dto.date);
    if (!dto.addressId && !dto.deliverySlotId && dto.note === undefined) {
      throw new BadRequestException(
        'Provide at least an addressId, a deliverySlotId, or a note to override',
      );
    }
    if (dto.addressId) {
      await this.addressesService.findOne(
        tenantId,
        subscription.userId,
        dto.addressId,
      );
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

  /**
   * Suggested refund amount for an admin cancelling this subscription —
   * prorated on undelivered days, not a flat leftover-cycle calendar span
   * (skips/pauses already extend cycleEnd for free, so they don't inflate
   * what's "pending"). Purely a starting point for the admin's cancel-
   * refund form; the actual amount submitted there can be anything.
   */
  async getRefundPreview(
    tenantId: string,
    id: string,
  ): Promise<{
    durationDaysSnapshot: number;
    deliveredDays: number;
    pendingDays: number;
    priceInPaiseSnapshot: number;
    suggestedAmountInPaise: number;
    razorpayRefundAvailable: boolean;
  }> {
    const subscription = await this.subscriptionsRepo.findByIdForTenantAdmin(
      tenantId,
      id,
    );
    if (!subscription) throw new NotFoundException('Subscription not found');

    const deliveredDays =
      await this.subscriptionsRepo.countMaterializedOrders(id);
    const pendingDays = Math.max(
      0,
      subscription.durationDaysSnapshot - deliveredDays,
    );
    const suggestedAmountInPaise = Math.round(
      (subscription.priceInPaiseSnapshot * pendingDays) /
        subscription.durationDaysSnapshot,
    );
    const [paidInvoice, razorpayFeatureEnabled] = await Promise.all([
      this.subscriptionsRepo.findPaidInvoiceBySubscriptionId(id),
      this.featuresService.hasFeature(tenantId, RAZORPAY_REFUNDS_FEATURE_KEY),
    ]);

    return {
      durationDaysSnapshot: subscription.durationDaysSnapshot,
      deliveredDays,
      pendingDays,
      priceInPaiseSnapshot: subscription.priceInPaiseSnapshot,
      suggestedAmountInPaise,
      razorpayRefundAvailable:
        razorpayFeatureEnabled && Boolean(paidInvoice?.razorpayPaymentId),
    };
  }

  async cancelWithRefund(
    tenantId: string,
    staffUserId: string,
    id: string,
    dto: CancelRefundDto,
  ): Promise<{ subscription: Subscription; refund: Refund }> {
    const subscription = await this.subscriptionsRepo.findByIdForTenantAdmin(
      tenantId,
      id,
    );
    if (!subscription) throw new NotFoundException('Subscription not found');
    if (subscription.status === 'CANCELLED') {
      throw new BadRequestException('This subscription is already cancelled.');
    }

    const convenienceFeeInPaise = dto.convenienceFeeInPaise ?? 0;
    const netRefundInPaise = Math.max(
      0,
      dto.amountInPaise - convenienceFeeInPaise,
    );

    let razorpayRefundId: string | undefined;
    if (dto.method === RefundMethod.RAZORPAY) {
      const allowed = await this.featuresService.hasFeature(
        tenantId,
        RAZORPAY_REFUNDS_FEATURE_KEY,
      );
      if (!allowed) {
        throw new ForbiddenException(
          'Razorpay refunds are not enabled for this business — record a manual refund instead, or ask the platform to turn it on.',
        );
      }
      const paidInvoice =
        await this.subscriptionsRepo.findPaidInvoiceBySubscriptionId(id);
      if (!paidInvoice?.razorpayPaymentId) {
        throw new BadRequestException(
          'This subscription has no Razorpay payment to refund.',
        );
      }
      if (dto.amountInPaise <= 0) {
        throw new BadRequestException(
          'Enter a refund amount greater than zero.',
        );
      }
      const result = await this.razorpayClient.refundPayment(tenantId, {
        razorpayPaymentId: paidInvoice.razorpayPaymentId,
        amountInPaise: netRefundInPaise,
        notes: { subscriptionId: subscription.id },
      });
      razorpayRefundId = result.razorpayRefundId;
    }

    const refund = await this.refundsRepo.create({
      tenantId,
      subscriptionId: id,
      method: dto.method,
      amountInPaise: dto.amountInPaise,
      convenienceFeeInPaise,
      netRefundInPaise,
      razorpayRefundId,
      recordedByUserId: staffUserId,
      notes: dto.notes,
    });

    const updated = await this.subscriptionsRepo.cancelWithRefund(id, {
      cancelledByUserId: staffUserId,
      cancellationReason: dto.reason,
    });

    return { subscription: updated, refund };
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

  /** Admin equivalent of getOwnedActiveSubscription() — scoped to the
   * tenant, not a specific customer, since the acting user here is staff
   * managing any subscriber's plan on their behalf. */
  private async getTenantActiveSubscription(tenantId: string, id: string) {
    const subscription = await this.subscriptionsRepo.findSubscriptionById(
      tenantId,
      id,
    );
    if (!subscription) {
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
