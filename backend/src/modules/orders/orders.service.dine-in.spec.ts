import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  BILL_SETTLED_MESSAGE,
  EMPTY_BILL_MESSAGE,
} from '../dine-in/dine-in-rules';

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: 'o1',
    fulfillmentType: 'DINE_IN',
    status: 'CONFIRMED',
    paymentStatus: 'PENDING',
    paymentMethod: 'CASH',
    dineInKitchenZoneId: 'z1',
    userId: null,
    items: [{ id: 'i1' }],
    ...overrides,
  };
}

function setup(current: ReturnType<typeof order> | null) {
  const ordersRepo = {
    findByIdForTenant: jest.fn().mockResolvedValue(current),
    markPaidManually: jest.fn().mockResolvedValue({}),
    assignTable: jest.fn().mockResolvedValue({}),
  };
  const table = { id: 't2', label: '2', kitchenZoneId: 'z1', isActive: true };
  const diningTablesService = {
    findActiveForTenant: jest.fn().mockResolvedValue(table),
    assertTableFree: jest.fn().mockResolvedValue(undefined),
  };
  const waitlistService = {
    claimForSeating: jest.fn().mockResolvedValue({
      id: 'w1',
      kitchenZoneId: 'z1',
      guestName: 'Sharma',
      guestPhone: null,
    }),
    releaseClaim: jest.fn().mockResolvedValue(undefined),
    markSeated: jest.fn().mockResolvedValue({}),
  };
  const none = {} as never;
  const service = new OrdersService(
    ordersRepo as never,
    none,
    none,
    none,
    none,
    none,
    none,
    none,
    none,
    none,
    none,
    none,
    diningTablesService as never,
    waitlistService as never,
    none,
    none,
    none,
    none,
  );
  return { service, ordersRepo, diningTablesService, waitlistService, table };
}

describe('OrdersService dine-in rules', () => {
  it('refuses to settle a bill with no items', async () => {
    const { service, ordersRepo } = setup(order({ items: [] }));
    await expect(service.markPaidManually('t', 'o1')).rejects.toThrow(
      EMPTY_BILL_MESSAGE,
    );
    expect(ordersRepo.markPaidManually).not.toHaveBeenCalled();
  });

  it('refuses a new round once the bill is paid', async () => {
    const { service } = setup(order({ paymentStatus: 'PAID' }));
    await expect(
      service.addItemsToDineInOrder('t', 'o1', {
        items: [{ mealId: 'm1', quantity: 1 }],
      }),
    ).rejects.toThrow(BILL_SETTLED_MESSAGE);
  });

  it('checks the new table is free, ignoring the order being moved', async () => {
    const { service, diningTablesService, ordersRepo, table } = setup(order());
    await service.assignTable('t', 'o1', { tableId: 't2' });
    expect(diningTablesService.assertTableFree).toHaveBeenCalledWith(
      't',
      table,
      'o1',
    );
    expect(ordersRepo.assignTable).toHaveBeenCalledWith('o1', 't2', '2');
  });

  it('does not move an order onto a busy table', async () => {
    const { service, diningTablesService, ordersRepo } = setup(order());
    diningTablesService.assertTableFree.mockRejectedValue(
      new ConflictException('busy'),
    );
    await expect(
      service.assignTable('t', 'o1', { tableId: 't2' }),
    ).rejects.toThrow(ConflictException);
    expect(ordersRepo.assignTable).not.toHaveBeenCalled();
  });

  it('puts the party back on the waitlist when the order cannot be opened', async () => {
    const { service, waitlistService } = setup(null);
    jest
      .spyOn(service, 'createDineIn')
      .mockRejectedValue(new ConflictException('Table 2 is busy'));
    await expect(
      service.seatWaitlistEntry('t', 'staff', 'w1', { tableId: 't2' }),
    ).rejects.toThrow('Table 2 is busy');
    expect(waitlistService.releaseClaim).toHaveBeenCalledWith('w1');
    expect(waitlistService.markSeated).not.toHaveBeenCalled();
  });

  it('links the opened order to the seated party', async () => {
    const { service, waitlistService } = setup(null);
    const create = jest
      .spyOn(service, 'createDineIn')
      .mockResolvedValue(order({ id: 'o9' }) as never);
    await service.seatWaitlistEntry('t', 'staff', 'w1', { tableId: 't2' });
    expect(create).toHaveBeenCalledWith(
      't',
      'staff',
      expect.objectContaining({ tableId: 't2', guestName: 'Sharma' }),
    );
    expect(waitlistService.markSeated).toHaveBeenCalledWith('w1', 'o9');
    expect(waitlistService.releaseClaim).not.toHaveBeenCalled();
  });

  it("shows counter staff only in-store orders, never a delivery order's details", async () => {
    await expect(
      setup(
        order({ fulfillmentType: 'DELIVERY' }),
      ).service.findDineInOrderForStaff('t', 'o1'),
    ).rejects.toThrow(NotFoundException);
    await expect(
      setup(
        order({ fulfillmentType: 'TAKEAWAY' }),
      ).service.findDineInOrderForStaff('t', 'o1'),
    ).resolves.toMatchObject({ id: 'o1' });
  });

  it('still settles a dine-in bill that has items', async () => {
    const { service, ordersRepo } = setup(order());
    await service.markPaidManually('t', 'o1', { paymentMethod: 'UPI' });
    expect(ordersRepo.markPaidManually).toHaveBeenCalledWith('o1', 'UPI', true);
  });

  it('keeps the closed-order guard for a served order', async () => {
    const { service } = setup(order({ status: 'DELIVERED' }));
    await expect(
      service.addItemsToDineInOrder('t', 'o1', {
        items: [{ mealId: 'm1', quantity: 1 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
