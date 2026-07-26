import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  OrdersRepository,
  OrderItemInput,
  OrderWithAdminDetails,
  OrderWithDetails,
} from './orders.repository';
import { CreateOrderDto, OrderItemInputDto } from './dto/create-order.dto';
import { PreviewOrderDto } from './dto/preview-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { QueryAdminOrdersDto } from './dto/query-admin-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AddressesService } from '../addresses/addresses.service';
import { MealsService } from '../menu/meals.service';
import { OrderAcceptanceService } from '../settings/order-acceptance.service';
import { SettingsRepository } from '../settings/settings.repository';
import { PromotionsService, CartMeal } from '../promotions/promotions.service';
import { RazorpayClientService } from '../../shared-modules/razorpay/razorpay-client.service';
import { PaginationService } from '../../common/services/pagination.service';
import { DateUtil } from '../../common/utils/date.util';

export interface CreatedOrder {
  order: OrderWithDetails;
  razorpayOrderId: string;
  razorpayKeyId: string;
}

export interface OrderPreview {
  subtotalInPaise: number;
  discountInPaise: number;
  couponApplied: boolean;
}

interface PricingResult {
  items: OrderItemInput[];
  subtotalInPaise: number;
  rawSubtotalInPaise: number;
  discountInPaise: number;
  couponId?: string;
  resolvedCouponCode?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepo: OrdersRepository,
    private readonly addressesService: AddressesService,
    private readonly mealsService: MealsService,
    private readonly orderAcceptanceService: OrderAcceptanceService,
    private readonly settingsRepo: SettingsRepository,
    private readonly promotionsService: PromotionsService,
    private readonly razorpayClient: RazorpayClientService,
    private readonly pagination: PaginationService,
  ) {}

  /**
   * Shared by create() and preview() — builds cart items with server-side
   * prices, then applies every automatic promotion and (optionally) a
   * coupon on top. Never trusts a client-submitted price, name, or discount.
   */
  private async computePricing(
    tenantId: string,
    userId: string,
    cartItems: OrderItemInputDto[],
    couponCode: string | undefined,
  ): Promise<PricingResult> {
    const mealIds = [...new Set(cartItems.map((item) => item.mealId))];
    const meals = await this.mealsService.findByIds(tenantId, mealIds);
    const mealMap = new Map<string, CartMeal>(
      meals.map((meal) => [
        meal.id,
        {
          id: meal.id,
          name: meal.name,
          categoryId: meal.categoryId,
          priceInPaise: meal.priceInPaise,
          isAvailable: meal.isAvailable,
        },
      ]),
    );

    const items: OrderItemInput[] = [];
    let rawSubtotalInPaise = 0;
    for (const cartItem of cartItems) {
      const meal = mealMap.get(cartItem.mealId);
      if (!meal || !meal.isAvailable) {
        throw new BadRequestException(
          `One of the items in your cart is no longer available — please review your cart.`,
        );
      }
      items.push({
        mealId: meal.id,
        nameSnapshot: meal.name,
        priceInPaiseSnapshot: meal.priceInPaise,
        quantity: cartItem.quantity,
      });
      rawSubtotalInPaise += meal.priceInPaise * cartItem.quantity;
    }

    const { extraItems, discountInPaise: automaticDiscountInPaise } =
      await this.promotionsService.computeCartPromotions(
        tenantId,
        items,
        mealMap,
        rawSubtotalInPaise,
      );

    let discountInPaise = automaticDiscountInPaise;
    let couponId: string | undefined;
    let resolvedCouponCode: string | undefined;
    if (couponCode) {
      const coupon = await this.promotionsService.validateCoupon(
        tenantId,
        couponCode,
        userId,
        rawSubtotalInPaise,
      );
      discountInPaise += coupon.discountInPaise;
      couponId = coupon.couponId;
      resolvedCouponCode = coupon.code;
    }

    const extraItemsValue = extraItems.reduce(
      (sum, item) => sum + item.priceInPaiseSnapshot * item.quantity,
      0,
    );

    return {
      items: [...items, ...extraItems],
      subtotalInPaise: rawSubtotalInPaise + extraItemsValue,
      rawSubtotalInPaise,
      discountInPaise,
      couponId,
      resolvedCouponCode,
    };
  }

  async preview(
    tenantId: string,
    userId: string,
    dto: PreviewOrderDto,
  ): Promise<OrderPreview> {
    const pricing = await this.computePricing(
      tenantId,
      userId,
      dto.items,
      dto.couponCode,
    );
    return {
      subtotalInPaise: pricing.subtotalInPaise,
      discountInPaise: pricing.discountInPaise,
      couponApplied: Boolean(pricing.couponId),
    };
  }

  async create(
    tenantId: string,
    userId: string,
    dto: CreateOrderDto,
  ): Promise<CreatedOrder> {
    await this.orderAcceptanceService.assertAcceptingOrders(tenantId);

    const address = await this.addressesService.findOne(
      tenantId,
      userId,
      dto.addressId,
    );
    const serviceability = await this.addressesService.checkServiceability(
      tenantId,
      {
        pincode: address.pincode,
        lat: address.lat ?? undefined,
        lng: address.lng ?? undefined,
      },
    );
    if (!serviceability.serviceable) {
      throw new BadRequestException(
        `We don't currently deliver to pincode ${address.pincode}`,
      );
    }

    // Prices and names are always recomputed server-side from the current
    // menu — never trust a client-submitted price or name.
    const pricing = await this.computePricing(
      tenantId,
      userId,
      dto.items,
      dto.couponCode,
    );

    // Minimum order amount is checked against the raw cart value, before any
    // discount — a coupon or freebie should never let someone duck under it.
    const minOrderAmountInPaise = serviceability.minOrderAmountInPaise ?? 0;
    if (pricing.rawSubtotalInPaise < minOrderAmountInPaise) {
      throw new BadRequestException(
        `Minimum order amount is ₹${(minOrderAmountInPaise / 100).toFixed(0)}.`,
      );
    }

    // Discounts apply to the subtotal before the free-delivery-threshold
    // check runs, so a coupon/promo can still push a borderline order under
    // the free-delivery line — same principle as the min-order check above,
    // just the opposite direction.
    const effectiveSubtotalInPaise = Math.max(
      0,
      pricing.subtotalInPaise - pricing.discountInPaise,
    );
    const freeDeliveryAboveAmountInPaise =
      serviceability.freeDeliveryAboveAmountInPaise;
    const qualifiesForFreeDelivery =
      freeDeliveryAboveAmountInPaise !== undefined &&
      effectiveSubtotalInPaise >= freeDeliveryAboveAmountInPaise;
    const deliveryFeeInPaise = qualifiesForFreeDelivery
      ? 0
      : (serviceability.deliveryFeeInPaise ?? 0);

    const [profile, slot] = await Promise.all([
      this.settingsRepo.findBusinessProfile(tenantId),
      this.settingsRepo.findDeliverySlotById(tenantId, dto.deliverySlotId),
    ]);
    if (!slot || !slot.isActive) {
      throw new BadRequestException('Selected delivery slot is not available.');
    }

    const timezone = profile?.timezone ?? 'Asia/Kolkata';
    const maxAdvanceOrderDays = profile?.maxAdvanceOrderDays ?? 2;
    const { dateStr: todayStr, minutesSinceMidnight: nowMinutes } =
      DateUtil.getTenantNow(timezone);
    const maxDateStr = DateUtil.addDaysToDateStr(todayStr, maxAdvanceOrderDays);

    if (dto.deliveryDate < todayStr || dto.deliveryDate > maxDateStr) {
      throw new BadRequestException(
        `Delivery date must be between ${todayStr} and ${maxDateStr}.`,
      );
    }
    if (
      dto.deliveryDate === todayStr &&
      DateUtil.hhmmToMinutes(slot.startTime) <= nowMinutes
    ) {
      throw new BadRequestException(
        'This delivery slot has already started today — pick a later slot or a future date.',
      );
    }

    const totalInPaise = effectiveSubtotalInPaise + deliveryFeeInPaise;
    const orderNumber = generateOrderNumber();

    // Razorpay order first, on purpose: if it fails, nothing is written to
    // our DB at all. Creating the local order first and the Razorpay order
    // second would risk leaving an orphaned PENDING_PAYMENT row with no
    // razorpayOrderId — unpayable and unrecoverable — whenever the Razorpay
    // call itself fails.
    const { razorpayOrderId, keyId } = await this.razorpayClient.createOrder(
      tenantId,
      {
        amountInPaise: totalInPaise,
        receipt: orderNumber,
      },
    );

    const order = await this.ordersRepo.create({
      tenantId,
      userId,
      addressId: dto.addressId,
      orderNumber,
      subtotalInPaise: pricing.subtotalInPaise,
      discountInPaise: pricing.discountInPaise,
      couponCode: pricing.resolvedCouponCode,
      couponId: pricing.couponId,
      deliveryFeeInPaise,
      totalInPaise,
      notes: dto.notes,
      items: pricing.items,
      razorpayOrderId,
      deliveryDate: new Date(`${dto.deliveryDate}T00:00:00.000Z`),
      deliverySlotId: slot.id,
      deliverySlotName: slot.name,
      deliveryWindowStart: slot.startTime,
      deliveryWindowEnd: slot.endTime,
    });

    return { order, razorpayOrderId, razorpayKeyId: keyId };
  }

  async findAll(tenantId: string, userId: string, query: QueryOrdersDto) {
    const skip = this.pagination.getOffsetSkip(query.page, query.limit);
    const [data, total] = await this.ordersRepo.findAllForUser(
      tenantId,
      userId,
      skip,
      query.limit,
    );
    return {
      data,
      meta: this.pagination.buildOffsetMeta(total, query.page, query.limit),
    };
  }

  async findOne(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<OrderWithDetails> {
    const order = await this.ordersRepo.findById(tenantId, userId, id);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findAllForAdmin(tenantId: string, query: QueryAdminOrdersDto) {
    const skip = this.pagination.getOffsetSkip(query.page, query.limit);
    const [data, total] = await this.ordersRepo.findAllForTenant(
      tenantId,
      skip,
      query.limit,
      query.status,
    );
    return {
      data,
      meta: this.pagination.buildOffsetMeta(total, query.page, query.limit),
    };
  }

  async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderWithAdminDetails> {
    const order = await this.ordersRepo.findByIdForTenant(tenantId, id);
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus !== 'PAID') {
      throw new BadRequestException(
        'Cannot update the status of an order that has not been paid yet.',
      );
    }

    await this.ordersRepo.updateStatus(id, dto.status);
    return { ...order, status: dto.status };
  }
}

function generateOrderNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}
