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
