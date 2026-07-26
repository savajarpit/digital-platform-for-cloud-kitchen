import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  OrdersRepository,
  OrderItemInput,
  OrderWithDetails,
} from './orders.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddressesService } from '../addresses/addresses.service';
import { MealsService } from '../menu/meals.service';
import { OrderAcceptanceService } from '../settings/order-acceptance.service';
import { RazorpayClientService } from '../../shared-modules/razorpay/razorpay-client.service';

export interface CreatedOrder {
  order: OrderWithDetails;
  razorpayOrderId: string;
  razorpayKeyId: string;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepo: OrdersRepository,
    private readonly addressesService: AddressesService,
    private readonly mealsService: MealsService,
    private readonly orderAcceptanceService: OrderAcceptanceService,
    private readonly razorpayClient: RazorpayClientService,
  ) {}

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
      address.pincode,
    );
    if (!serviceability.serviceable) {
      throw new BadRequestException(
        `We don't currently deliver to pincode ${address.pincode}`,
      );
    }

    // Prices and names are always recomputed server-side from the current
    // menu — never trust a client-submitted price or name.
    const mealIds = [...new Set(dto.items.map((item) => item.mealId))];
    const meals = await this.mealsService.findByIds(tenantId, mealIds);
    const mealMap = new Map(meals.map((meal) => [meal.id, meal]));

    const items: OrderItemInput[] = [];
    let subtotalInPaise = 0;
    for (const cartItem of dto.items) {
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
      subtotalInPaise += meal.priceInPaise * cartItem.quantity;
    }

    const deliveryFeeInPaise = serviceability.deliveryFeeInPaise ?? 0;
    const minOrderAmountInPaise = serviceability.minOrderAmountInPaise ?? 0;
    if (subtotalInPaise < minOrderAmountInPaise) {
      throw new BadRequestException(
        `Minimum order amount is ₹${(minOrderAmountInPaise / 100).toFixed(0)}.`,
      );
    }

    const totalInPaise = subtotalInPaise + deliveryFeeInPaise;
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
      subtotalInPaise,
      deliveryFeeInPaise,
      totalInPaise,
      notes: dto.notes,
      items,
      razorpayOrderId,
    });

    return { order, razorpayOrderId, razorpayKeyId: keyId };
  }

  findAll(tenantId: string, userId: string): Promise<OrderWithDetails[]> {
    return this.ordersRepo.findAllForUser(tenantId, userId);
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
}

function generateOrderNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}
