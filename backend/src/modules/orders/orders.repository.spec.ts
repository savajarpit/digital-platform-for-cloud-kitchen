import { OrdersRepository } from './orders.repository';
import { PrismaService } from '../../database/prisma/prisma.service';

describe('OrdersRepository.markFailed', () => {
  const updateMany = jest.fn();
  const repo = new OrdersRepository({
    order: { updateMany },
  } as unknown as PrismaService);

  afterEach(() => updateMany.mockReset());

  it('only ever targets orders that are not already PAID', async () => {
    updateMany.mockResolvedValue({ count: 1 });
    await expect(repo.markFailed('o1')).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'o1', paymentStatus: { not: 'PAID' } },
      data: { paymentStatus: 'FAILED' },
    });
  });

  it('reports no change when the order was already paid', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(repo.markFailed('o1')).resolves.toBe(false);
  });
});

describe('OrdersRepository order lists (cash on delivery)', () => {
  const findMany = jest.fn().mockResolvedValue([]);
  const count = jest.fn().mockResolvedValue(0);
  const repo = new OrdersRepository({
    order: { findMany, count },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService);
  const abandonedCheckout = {
    NOT: { status: 'PENDING_PAYMENT', paymentMethod: 'RAZORPAY' },
  };

  afterEach(() => findMany.mockClear());

  it('hides only abandoned online checkouts from the admin list', async () => {
    await repo.findAllForTenant('t1', 0, 20);
    const { where } = (findMany.mock.calls[0] as unknown[])[0] as {
      where: object;
    };
    expect(where).toEqual({ tenantId: 't1', ...abandonedCheckout });
  });

  it('lists just the awaiting-payment cash/UPI orders when filtered', async () => {
    await repo.findAllForTenant('t1', 0, 20, 'PENDING_PAYMENT');
    const { where } = (findMany.mock.calls[0] as unknown[])[0] as {
      where: object;
    };
    expect(where).toEqual({
      tenantId: 't1',
      status: 'PENDING_PAYMENT',
      ...abandonedCheckout,
    });
  });

  it('shows the customer their own unpaid phone order', async () => {
    await repo.findAllForUser('t1', 'u1', 0, 20);
    const { where } = (findMany.mock.calls[0] as unknown[])[0] as {
      where: object;
    };
    expect(where).toEqual({
      tenantId: 't1',
      userId: 'u1',
      ...abandonedCheckout,
    });
  });
});

describe('OrdersRepository.addItems (dine-in rounds)', () => {
  it("saves each new line's add-ons along with it", async () => {
    const create = jest.fn().mockResolvedValue({});
    const update = jest.fn().mockResolvedValue({ items: [] });
    const tx = { orderItem: { create }, order: { update } };
    const repo = new OrdersRepository({
      $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    } as unknown as PrismaService);

    await repo.addItems(
      'o1',
      [
        {
          mealId: 'm1',
          nameSnapshot: 'Juice',
          priceInPaiseSnapshot: 12900,
          quantity: 2,
          addons: [
            {
              addonItemId: 'a1',
              nameSnapshot: 'Chutney',
              priceInPaiseSnapshot: 500,
              quantity: 1,
            },
          ],
        },
        {
          mealId: 'm2',
          nameSnapshot: 'Salad',
          priceInPaiseSnapshot: 24900,
          quantity: 1,
        },
      ],
      36800,
      0,
    );

    expect(create).toHaveBeenCalledTimes(2);
    const first = (create.mock.calls[0] as unknown[])[0] as {
      data: { addons?: { create: unknown[] } };
    };
    expect(first.data.addons?.create).toEqual([
      {
        addonItemId: 'a1',
        nameSnapshot: 'Chutney',
        priceInPaiseSnapshot: 500,
        quantity: 1,
      },
    ]);
    const second = (create.mock.calls[1] as unknown[])[0] as {
      data: { addons?: unknown };
    };
    expect(second.data.addons).toBeUndefined();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          subtotalInPaise: { increment: 36800 },
          discountInPaise: { increment: 0 },
          totalInPaise: { increment: 36800 },
        },
      }),
    );
  });
});
