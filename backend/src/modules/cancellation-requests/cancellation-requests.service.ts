import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CancellationRequestStatus,
  CustomerCancellationRequest,
} from '../../generated/prisma';
import { DateUtil } from '../../common/utils/date.util';
import { PaginationService } from '../../common/services/pagination.service';
import { FeaturesService } from '../features/features.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  CancellationNotifier,
  CancellationTarget,
} from '../../shared-modules/cancellation-notifications/cancellation-notifier.service';
import {
  detailRow,
  formatDateLabel,
  formatRupees,
} from '../../shared-modules/cancellation-notifications/cancellation-email.util';
import {
  CancellationRequestWithDetails,
  CancellationRequestsRepository,
} from './cancellation-requests.repository';
import {
  ORDER_CANCEL_REQUESTS_FEATURE_KEY,
  cancellationReasonLabel,
} from './cancellation-requests.constants';
import {
  orderCancelBlockReason,
  subscriptionCancelBlockReason,
} from './cancellation-eligibility';
import { CreateCancellationRequestDto } from './dto/create-cancellation-request.dto';
import { RejectCancellationRequestDto } from './dto/reject-cancellation-request.dto';
import { QueryCancellationRequestsDto } from './dto/query-cancellation-requests.dto';

const ALREADY_PENDING =
  'You’ve already asked to cancel this — the kitchen will get back to you soon.';

/**
 * Customer "please cancel" requests for subscriptions and one-time orders.
 * A request never cancels anything itself: the kitchen approves it through
 * the existing Cancel & Refund (which closes the request in the same
 * transaction) or rejects it here with a note. While a subscription
 * request is pending its deliveries are held (see the materializer); a
 * reject or withdraw banks those held days back.
 */
@Injectable()
export class CancellationRequestsService {
  constructor(
    private readonly repo: CancellationRequestsRepository,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly featuresService: FeaturesService,
    private readonly notifier: CancellationNotifier,
    private readonly pagination: PaginationService,
  ) {}

  async requestForSubscription(
    tenantId: string,
    userId: string,
    subscriptionId: string,
    dto: CreateCancellationRequestDto,
  ): Promise<CustomerCancellationRequest> {
    const subscription = await this.repo.findOwnedSubscription(
      tenantId,
      userId,
      subscriptionId,
    );
    if (!subscription) throw new NotFoundException('Subscription not found');
    const blocked = subscriptionCancelBlockReason(subscription);
    if (blocked) throw new BadRequestException(blocked);

    const heldFromDate =
      await this.subscriptionsService.getCancellationHoldStart(tenantId);
    const request = await this.repo.createIfNonePending({
      tenantId,
      userId,
      subscriptionId,
      reason: dto.reason,
      note: dto.note,
      heldFromDate,
    });
    if (!request) throw new ConflictException(ALREADY_PENDING);

    await this.announce(tenantId, request, {
      kind: 'SUBSCRIPTION',
      id: subscription.id,
      label: subscription.planNameSnapshot,
    });
    return request;
  }

  async requestForOrder(
    tenantId: string,
    userId: string,
    orderId: string,
    dto: CreateCancellationRequestDto,
  ): Promise<CustomerCancellationRequest> {
    const order = await this.repo.findOwnedOrder(tenantId, userId, orderId);
    if (!order) throw new NotFoundException('Order not found');
    const blocked = orderCancelBlockReason(
      order,
      await this.orderGates(tenantId),
    );
    if (blocked) throw new BadRequestException(blocked);

    const request = await this.repo.createIfNonePending({
      tenantId,
      userId,
      orderId,
      reason: dto.reason,
      note: dto.note,
    });
    if (!request) throw new ConflictException(ALREADY_PENDING);

    await this.announce(tenantId, request, {
      kind: 'ORDER',
      id: order.id,
      label: `Order ${order.orderNumber}`,
    });
    return request;
  }

  /** What the customer's order page needs: the latest request (if any)
   * and whether a new one can be raised — with the reason when not. */
  async getOrderStatus(
    tenantId: string,
    userId: string,
    orderId: string,
  ): Promise<{
    request: CustomerCancellationRequest | null;
    canRequest: boolean;
    blockedReason: string | null;
  }> {
    const order = await this.repo.findOwnedOrder(tenantId, userId, orderId);
    if (!order) throw new NotFoundException('Order not found');
    const [request, gates] = await Promise.all([
      this.repo.findLatestForOrder(tenantId, orderId),
      this.orderGates(tenantId),
    ]);
    // With the feature off the button simply doesn't exist — no reason to
    // show, same as any other feature-gated control.
    if (!gates.featureEnabled || !gates.tenantEnabled) {
      return { request, canRequest: false, blockedReason: null };
    }
    const pending = request?.status === CancellationRequestStatus.PENDING;
    const blockedReason = pending ? null : orderCancelBlockReason(order, gates);
    return { request, canRequest: !pending && !blockedReason, blockedReason };
  }

  async withdraw(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<CustomerCancellationRequest> {
    const request = await this.repo.findByIdForTenant(tenantId, id);
    if (!request || request.userId !== userId) {
      throw new NotFoundException('Request not found');
    }
    const closed = await this.repo.closeIfPending(id, {
      status: CancellationRequestStatus.WITHDRAWN,
    });
    if (!closed) {
      throw new BadRequestException('This request has already been answered.');
    }
    await this.bankHeldDays(tenantId, request);
    return (await this.repo.findByIdForTenant(tenantId, id))!;
  }

  async reject(
    tenantId: string,
    staffUserId: string,
    id: string,
    dto: RejectCancellationRequestDto,
    kind: 'SUBSCRIPTION' | 'ORDER',
  ): Promise<CancellationRequestWithDetails> {
    const request = await this.repo.findByIdForTenant(tenantId, id);
    // The route decides which permission guarded this call, so a request
    // of the other kind is "not found" here, never rejected through it.
    const matchesKind =
      kind === 'SUBSCRIPTION'
        ? Boolean(request?.subscriptionId)
        : Boolean(request?.orderId);
    if (!request || !matchesKind) {
      throw new NotFoundException('Request not found');
    }
    const closed = await this.repo.closeIfPending(id, {
      status: CancellationRequestStatus.REJECTED,
      resolvedByUserId: staffUserId,
      resolutionNote: dto.note,
    });
    if (!closed) {
      throw new BadRequestException(
        'This request is no longer pending — refresh to see its latest status.',
      );
    }
    const bankedDays = await this.bankHeldDays(tenantId, request);
    await this.notifier.notifyRejected({
      tenantId,
      requestId: request.id,
      target: targetOf(request),
      customer: request.user,
      resolutionNote: dto.note,
      bankedDays,
    });
    return (await this.repo.findByIdForTenant(tenantId, id))!;
  }

  async findAllForAdmin(tenantId: string, query: QueryCancellationRequestsDto) {
    const skip = this.pagination.getOffsetSkip(query.page, query.limit);
    const [data, total] = await this.repo.findMany(
      tenantId,
      { status: query.status, type: query.type },
      skip,
      query.limit,
    );
    return {
      data: data.map((r) => ({
        ...r,
        reasonLabel: cancellationReasonLabel(r.reason),
      })),
      meta: this.pagination.buildOffsetMeta(total, query.page, query.limit),
    };
  }

  countPending(tenantId: string) {
    return this.repo.countPending(tenantId);
  }

  /** The pending request (if any) for one subscription/order — backs the
   * banner on the admin detail pages. */
  async findPendingForTarget(
    tenantId: string,
    target: { subscriptionId?: string; orderId?: string },
  ) {
    const request = await this.repo.findPendingForTarget(tenantId, target);
    return request
      ? { ...request, reasonLabel: cancellationReasonLabel(request.reason) }
      : null;
  }

  private async orderGates(tenantId: string) {
    const [featureEnabled, tenant] = await Promise.all([
      this.featuresService.hasFeature(
        tenantId,
        ORDER_CANCEL_REQUESTS_FEATURE_KEY,
      ),
      this.repo.findTenantContext(tenantId),
    ]);
    return {
      featureEnabled,
      tenantEnabled: Boolean(
        tenant?.orderAcceptanceSettings?.allowOrderCancelRequests,
      ),
    };
  }

  private async bankHeldDays(
    tenantId: string,
    request: CustomerCancellationRequest,
  ): Promise<number> {
    if (!request.subscriptionId) return 0;
    const banked = await this.subscriptionsService.bankHeldDays(
      tenantId,
      request.subscriptionId,
      request.id,
    );
    if (banked > 0) await this.repo.setBankedDays(request.id, banked);
    return banked;
  }

  private async announce(
    tenantId: string,
    request: CustomerCancellationRequest,
    target: CancellationTarget,
  ): Promise<void> {
    const [customer, ownerEmails, detailsHtml] = await Promise.all([
      this.repo.findCustomer(tenantId, request.userId),
      this.repo.findOwnerRecipients(tenantId),
      this.ownerDetails(tenantId, target),
    ]);
    if (!customer) return;
    await this.notifier.notifyRequested({
      tenantId,
      requestId: request.id,
      target,
      customer,
      ownerEmails,
      reasonLabel: cancellationReasonLabel(request.reason),
      note: request.note,
      heldFromDate: request.heldFromDate,
      detailsHtml,
    });
  }

  /** The owner email's "what's at stake" block: for a plan, its dates,
   * how much is delivered and the suggested refund; for an order, its
   * total and delivery slot. */
  private async ownerDetails(
    tenantId: string,
    target: CancellationTarget,
  ): Promise<string> {
    const tenant = await this.repo.findTenantContext(tenantId);
    const timezone = tenant?.businessProfile?.timezone ?? 'Asia/Kolkata';
    if (target.kind === 'SUBSCRIPTION') {
      const [subscription, preview] = await Promise.all([
        this.repo.findPendingForTarget(tenantId, { subscriptionId: target.id }),
        this.subscriptionsService.getRefundPreview(tenantId, target.id),
      ]);
      const sub = subscription?.subscription;
      const span =
        sub?.startDate && sub.cycleEnd
          ? `${formatDateLabel(DateUtil.toTenantDateStr(sub.startDate, timezone))} – ${formatDateLabel(DateUtil.toTenantDateStr(sub.cycleEnd, timezone))}`
          : 'Not started yet';
      return [
        detailRow('Plan dates', span),
        detailRow(
          'Progress',
          `${preview.deliveredDays} of ${preview.durationDaysSnapshot} days delivered · paid ₹${formatRupees(preview.priceInPaiseSnapshot)}`,
        ),
        detailRow(
          'Suggested refund',
          `₹${formatRupees(preview.suggestedAmountInPaise)} for ${preview.pendingDays} undelivered ${preview.pendingDays === 1 ? 'day' : 'days'}`,
        ),
      ].join('');
    }
    const pending = await this.repo.findPendingForTarget(tenantId, {
      orderId: target.id,
    });
    const order = pending?.order;
    if (!order) return '';
    const when = order.isInstant
      ? 'Instant delivery'
      : `${order.deliverySlotName} on ${formatDateLabel(DateUtil.toTenantDateStr(order.deliveryDate, 'UTC'))}`;
    return [
      detailRow('Order total', `₹${formatRupees(order.totalInPaise)} (paid)`),
      detailRow('Delivery', when),
    ].join('');
  }
}

function targetOf(request: CancellationRequestWithDetails): CancellationTarget {
  if (request.subscription) {
    return {
      kind: 'SUBSCRIPTION',
      id: request.subscription.id,
      label: request.subscription.planNameSnapshot,
    };
  }
  return {
    kind: 'ORDER',
    id: request.order?.id ?? '',
    label: `Order ${request.order?.orderNumber ?? ''}`,
  };
}
