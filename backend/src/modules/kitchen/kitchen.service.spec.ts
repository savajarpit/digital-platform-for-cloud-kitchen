import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderFulfillmentType,
  OrderStatus,
  PaymentMethod,
} from '../../generated/prisma';
import { Role } from '../../common/enums/role.enum';
import { DateUtil } from '../../common/utils/date.util';
import { KitchenService } from './kitchen.service';
import { kitchenRow } from './kitchen.fixtures-spec';

const TENANT = 't1';
const owner = { tenantId: TENANT, role: Role.OWNER };
const staff = { tenantId: TENANT, role: Role.STAFF };
const today = DateUtil.getTenantNow('Asia/Kolkata').dateStr;
const todayMidnight = new Date(`${today}T00:00:00.000Z`);

function setup(opts: { features?: string[]; permissions?: string[] } = {}) {
  const repo = {
    findOrdersInRange: jest.fn().mockResolvedValue([]),
    findOrderById: jest.fn(),
    moveStatus: jest.fn().mockResolvedValue(true),
    findChangedSubscriptionIds: jest.fn().mockResolvedValue(new Set()),
    findActiveSlots: jest.fn().mockResolvedValue([]),
    findPlans: jest.fn().mockResolvedValue([{ id: 'p1', name: 'Plan' }]),
    findTimezone: jest.fn().mockResolvedValue('Asia/Kolkata'),
  };
  const features = {
    getMyFeatures: jest
      .fn()
      .mockResolvedValue({ features: opts.features ?? [] }),
  };
  const permissions = {
    hasPermission: jest.fn((_t: string, _r: Role, key: string) =>
      Promise.resolve((opts.permissions ?? []).includes(key)),
    ),
  };
  const settings = {
    getPickupInfo: jest.fn().mockResolvedValue({ available: false, zones: [] }),
  };
  const service = new KitchenService(
    repo as never,
    features as never,
    permissions as never,
    settings as never,
  );
  return { service, repo };
}

const planRow = kitchenRow({
  id: 'plan-order',
  subscriptionId: 'sub-1',
  subscription: { planId: 'p1' },
  notes: 'Subscription: Lean — Day 2',
  deliveryDate: todayMidnight,
} as never);
const tableRow = kitchenRow({
  id: 'table-order',
  status: OrderStatus.PENDING_PAYMENT,
  paymentMethod: PaymentMethod.CASH,
  fulfillmentType: OrderFulfillmentType.DINE_IN,
  deliveryDate: new Date(),
  deliveryWindowStart: '-',
});
const deliveryRow = kitchenRow({ deliveryDate: todayMidnight });

describe('KitchenService.getBoard', () => {
  it('hides plan deliveries and table orders when those features are off', async () => {
    const { service, repo } = setup();
    repo.findOrdersInRange.mockResolvedValue([deliveryRow, planRow, tableRow]);
    const board = await service.getBoard(owner, {});
    expect(board.orders.map((o) => o.id)).toEqual(['o1']);
  });

  it('shows them once the business has the features', async () => {
    const { service, repo } = setup({ features: ['subscriptions', 'dine-in'] });
    repo.findOrdersInRange.mockResolvedValue([deliveryRow, planRow, tableRow]);
    const board = await service.getBoard(owner, {});
    expect(board.orders.map((o) => o.id).sort()).toEqual([
      'o1',
      'plan-order',
      'table-order',
    ]);
    expect(board.counts.NEW).toBe(3);
  });

  it('keeps unpaid online orders and other days off the board', async () => {
    const { service, repo } = setup();
    repo.findOrdersInRange.mockResolvedValue([
      kitchenRow({ id: 'unpaid', status: OrderStatus.PENDING_PAYMENT }),
      kitchenRow({
        id: 'tomorrow',
        deliveryDate: new Date(
          `${DateUtil.addDaysToDateStr(today, 1)}T00:00:00.000Z`,
        ),
      }),
      deliveryRow,
    ]);
    const board = await service.getBoard(owner, {});
    expect(board.orders.map((o) => o.id)).toEqual(['o1']);
  });

  it('hides contact details unless the viewer can also manage orders', async () => {
    const { service, repo } = setup({ permissions: ['kitchen.view'] });
    repo.findOrdersInRange.mockResolvedValue([deliveryRow]);
    expect((await service.getBoard(staff, {})).orders[0].contact).toBeNull();

    const withOrders = setup({
      permissions: ['kitchen.view', 'orders.manage'],
    });
    withOrders.repo.findOrdersInRange.mockResolvedValue([deliveryRow]);
    expect(
      (await withOrders.service.getBoard(staff, {})).orders[0].contact?.email,
    ).toBe('riya@example.com');
  });

  it('counts every stage but lists only the chosen one', async () => {
    const { service, repo } = setup();
    repo.findOrdersInRange.mockResolvedValue([
      deliveryRow,
      kitchenRow({
        id: 'cooking',
        status: OrderStatus.PREPARING,
        deliveryDate: todayMidnight,
      }),
    ]);
    const board = await service.getBoard(owner, { stage: 'PREPARING' });
    expect(board.orders.map((o) => o.id)).toEqual(['cooking']);
    expect(board.counts).toEqual({ NEW: 1, PREPARING: 1, READY: 0, DONE: 0 });
  });

  it('refuses a date outside the picker range', async () => {
    const { service } = setup();
    await expect(
      service.getBoard(owner, { date: DateUtil.addDaysToDateStr(today, 91) }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('KitchenService.move', () => {
  it('moves the order only from the status it was read in', async () => {
    const { service, repo } = setup();
    repo.findOrderById.mockResolvedValue(deliveryRow);
    await service.move(owner, 'o1', 'PREPARING');
    expect(repo.moveStatus).toHaveBeenCalledWith(
      TENANT,
      'o1',
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
    );
  });

  it('reports a conflict when someone else moved it first', async () => {
    const { service, repo } = setup();
    repo.findOrderById.mockResolvedValue(deliveryRow);
    repo.moveStatus.mockResolvedValue(false);
    await expect(service.move(owner, 'o1', 'PREPARING')).rejects.toThrow(
      ConflictException,
    );
  });

  it("can't reach an order the kitchen isn't allowed to see", async () => {
    const { service, repo } = setup();
    repo.findOrderById.mockResolvedValue(planRow);
    await expect(
      service.move(owner, 'plan-order', 'PREPARING'),
    ).rejects.toThrow(NotFoundException);
    repo.findOrderById.mockResolvedValue(null);
    await expect(service.move(owner, 'x', 'PREPARING')).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.moveStatus).not.toHaveBeenCalled();
  });
});

describe('KitchenService.getMeta', () => {
  it('lists plans only for a business with subscriptions', async () => {
    const off = setup();
    expect((await off.service.getMeta(owner)).plans).toEqual([]);
    const on = setup({
      features: ['subscriptions'],
      permissions: ['kitchen.update'],
    });
    const meta = await on.service.getMeta(owner);
    expect(meta.plans).toHaveLength(1);
    expect(meta.canUpdate).toBe(true);
    expect(meta.flags).toEqual({
      subscriptions: true,
      dineIn: false,
      pickup: false,
      addons: false,
    });
  });
});
