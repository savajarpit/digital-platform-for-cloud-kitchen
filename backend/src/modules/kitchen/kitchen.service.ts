import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '../../generated/prisma';
import { Role } from '../../common/enums/role.enum';
import { DateUtil } from '../../common/utils/date.util';
import { FeaturesService } from '../features/features.service';
import { PermissionsService } from '../permissions/permissions.service';
import { SettingsService } from '../settings/settings.service';
import { withAddressSnapshot } from '../orders/orders.repository';
import { KitchenRepository, type KitchenOrderRow } from './kitchen.repository';
import {
  assertKitchenMove,
  isInStore,
  kitchenDateStrOf,
  kitchenStageOf,
  type KitchenTarget,
} from './kitchen-rules';
import { toKitchenCard, type KitchenCard } from './kitchen-card.util';
import {
  countByStage,
  matchesKitchenFilters,
  matchesKitchenSearch,
  sortKitchenCards,
  type KitchenStageCounts,
} from './kitchen-filters.util';
import { buildPrepSummary, type KitchenPrepSummary } from './kitchen-prep.util';
import { QueryKitchenDto } from './dto/query-kitchen.dto';

/** How far back/ahead the date picker may go. */
const PAST_DAYS = 7;
const FUTURE_DAYS = 90;

/** Which optional parts of the Kitchen screen this business has. */
export interface KitchenFlags {
  subscriptions: boolean;
  dineIn: boolean;
  pickup: boolean;
  addons: boolean;
}

interface Viewer {
  tenantId: string;
  role: Role;
}

interface KitchenAccess {
  flags: KitchenFlags;
  canSeeContact: boolean;
  timezone: string;
}

@Injectable()
export class KitchenService {
  constructor(
    private readonly kitchenRepo: KitchenRepository,
    private readonly featuresService: FeaturesService,
    private readonly permissionsService: PermissionsService,
    private readonly settingsService: SettingsService,
  ) {}

  /** Everything the screen needs to draw its filters for this business. */
  async getMeta(viewer: Viewer) {
    const [access, canUpdate, slots] = await Promise.all([
      this.accessFor(viewer),
      this.can(viewer, 'kitchen.update'),
      this.kitchenRepo.findActiveSlots(viewer.tenantId),
    ]);
    const { dateStr: today } = DateUtil.getTenantNow(access.timezone);
    return {
      today,
      minDate: DateUtil.addDaysToDateStr(today, -PAST_DAYS),
      maxDate: DateUtil.addDaysToDateStr(today, FUTURE_DAYS),
      flags: access.flags,
      canUpdate,
      canSeeContact: access.canSeeContact,
      slots,
      plans: access.flags.subscriptions
        ? await this.kitchenRepo.findPlans(viewer.tenantId)
        : [],
    };
  }

  async getBoard(
    viewer: Viewer,
    query: QueryKitchenDto,
  ): Promise<{
    date: string;
    counts: KitchenStageCounts;
    orders: KitchenCard[];
  }> {
    const { date, cards } = await this.loadDay(viewer, query);
    const visible = query.stage
      ? cards.filter((c) => c.stage === query.stage)
      : cards;
    return {
      date,
      counts: countByStage(cards),
      orders: sortKitchenCards(visible, query.sort),
    };
  }

  async getPrepSummary(
    viewer: Viewer,
    query: QueryKitchenDto,
  ): Promise<{ date: string } & KitchenPrepSummary> {
    const { date, cards } = await this.loadDay(viewer, query);
    return { date, ...buildPrepSummary(cards, query.category) };
  }

  /** Start / Mark ready / undo Mark ready — only if nobody moved it first. */
  async move(
    viewer: Viewer,
    id: string,
    target: KitchenTarget,
  ): Promise<KitchenCard> {
    const access = await this.accessFor(viewer);
    const order = await this.kitchenRepo.findOrderById(viewer.tenantId, id);
    if (!order || !this.isVisible(order, access.flags)) {
      throw new NotFoundException('Order not found');
    }
    assertKitchenMove(
      { ...order, cancelRequested: order.cancellationRequests.length > 0 },
      target,
    );
    const moved = await this.kitchenRepo.moveStatus(
      viewer.tenantId,
      id,
      order.status,
      OrderStatus[target],
    );
    if (!moved) {
      throw new ConflictException(
        'Someone else just updated this order — the list has been refreshed.',
      );
    }
    const updated = await this.kitchenRepo.findOrderById(viewer.tenantId, id);
    const changed = await this.changedSubscriptions(
      [updated!],
      kitchenDateStrOf(updated!, access.timezone),
    );
    return this.toCard(updated!, access, changed);
  }

  private async loadDay(
    viewer: Viewer,
    query: QueryKitchenDto,
  ): Promise<{ date: string; cards: KitchenCard[] }> {
    const access = await this.accessFor(viewer);
    const date = this.resolveDate(query.date, access.timezone);
    const from = new Date(
      `${DateUtil.addDaysToDateStr(date, -1)}T00:00:00.000Z`,
    );
    const to = new Date(`${DateUtil.addDaysToDateStr(date, 2)}T00:00:00.000Z`);
    const rows = (
      await this.kitchenRepo.findOrdersInRange(viewer.tenantId, from, to)
    ).filter(
      (order) =>
        kitchenStageOf(order) !== null &&
        this.isVisible(order, access.flags) &&
        kitchenDateStrOf(order, access.timezone) === date &&
        matchesKitchenSearch(order, query.q),
    );
    const changed = await this.changedSubscriptions(rows, date);
    const cards = rows
      .map((order) => this.toCard(order, access, changed))
      .filter((card) => matchesKitchenFilters(card, query));
    return { date, cards };
  }

  private toCard(
    order: KitchenOrderRow,
    access: KitchenAccess,
    changed: Set<string>,
  ): KitchenCard {
    return toKitchenCard(withAddressSnapshot(order), {
      stage: kitchenStageOf(order)!,
      timezone: access.timezone,
      canSeeContact: access.canSeeContact,
      dayChanged: Boolean(
        order.subscriptionId && changed.has(order.subscriptionId),
      ),
    });
  }

  /** Plan deliveries only with Subscriptions, counter orders only with
   * Dine-in. Pickup orders always show — one already placed must still be
   * cooked even if the business has since switched pickup off. */
  private isVisible(order: KitchenOrderRow, flags: KitchenFlags): boolean {
    if (order.subscriptionId && !flags.subscriptions) return false;
    if (isInStore(order.fulfillmentType) && !flags.dineIn) return false;
    return true;
  }

  private changedSubscriptions(
    orders: KitchenOrderRow[],
    date: string,
  ): Promise<Set<string>> {
    const ids = orders
      .map((o) => o.subscriptionId)
      .filter((id): id is string => Boolean(id));
    return this.kitchenRepo.findChangedSubscriptionIds(ids, date);
  }

  private resolveDate(requested: string | undefined, timezone: string): string {
    const { dateStr: today } = DateUtil.getTenantNow(timezone);
    if (!requested) return today;
    const offset = DateUtil.diffInDays(today, requested);
    if (offset < -PAST_DAYS || offset > FUTURE_DAYS) {
      throw new BadRequestException(
        `Pick a date from the last ${PAST_DAYS} days up to ${FUTURE_DAYS} days ahead.`,
      );
    }
    return requested;
  }

  private async accessFor(viewer: Viewer): Promise<KitchenAccess> {
    const [{ features }, pickup, canSeeContact, timezone] = await Promise.all([
      this.featuresService.getMyFeatures(viewer.role, viewer.tenantId),
      this.settingsService.getPickupInfo(viewer.tenantId),
      this.can(viewer, 'orders.manage'),
      this.kitchenRepo.findTimezone(viewer.tenantId),
    ]);
    return {
      flags: {
        subscriptions: features.includes('subscriptions'),
        dineIn: features.includes('dine-in'),
        pickup: pickup.available,
        addons: features.includes('menu-addons'),
      },
      canSeeContact,
      timezone,
    };
  }

  private async can(viewer: Viewer, permission: string): Promise<boolean> {
    if (viewer.role === Role.SUPER_ADMIN) return true;
    return this.permissionsService.hasPermission(
      viewer.tenantId,
      viewer.role,
      permission,
    );
  }
}
