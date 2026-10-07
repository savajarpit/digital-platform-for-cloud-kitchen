import { ConflictException } from '@nestjs/common';
import { DiningTablesService } from './dining-tables.service';

const table = {
  id: 't1',
  tenantId: 'tenant',
  kitchenZoneId: 'z1',
  label: '4',
  capacity: 4,
  isActive: true,
};

function setup(activeOrderId: string | null) {
  const repo = {
    findById: jest.fn().mockResolvedValue(table),
    findActiveOrderId: jest.fn().mockResolvedValue(activeOrderId),
    findAllForTenant: jest.fn(),
    countByLabel: jest.fn().mockResolvedValue(0),
    update: jest.fn().mockResolvedValue(table),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const service = new DiningTablesService(repo as never, {} as never);
  return { service, repo };
}

describe('DiningTablesService', () => {
  it('refuses a second open order on a busy table', async () => {
    const { service, repo } = setup('o1');
    await expect(
      service.assertTableFree('tenant', table as never),
    ).rejects.toThrow(
      'Table 4 already has an open order — add items to it, or pick another table.',
    );
    expect(repo.findActiveOrderId).toHaveBeenCalledWith(
      'tenant',
      't1',
      undefined,
    );
  });

  it('lets the order already at the table stay there', async () => {
    const { service, repo } = setup(null);
    await service.assertTableFree('tenant', table as never, 'o1');
    expect(repo.findActiveOrderId).toHaveBeenCalledWith('tenant', 't1', 'o1');
  });

  it('will not deactivate or remove a table with an open order', async () => {
    const { service, repo } = setup('o1');
    await expect(
      service.update('tenant', 't1', { isActive: false }),
    ).rejects.toThrow(ConflictException);
    await expect(service.delete('tenant', 't1')).rejects.toThrow(
      'before you remove this table',
    );
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('still renames or resizes a busy table', async () => {
    const { service, repo } = setup('o1');
    await service.update('tenant', 't1', { capacity: 6 });
    expect(repo.update).toHaveBeenCalled();
  });

  it('lists tables in natural order', async () => {
    const { service, repo } = setup(null);
    repo.findAllForTenant.mockResolvedValue(
      ['10', '2', '1'].map((label) => ({ ...table, label })),
    );
    const labels = (await service.findAllForTenant('tenant')).map(
      (t) => t.label,
    );
    expect(labels).toEqual(['1', '2', '10']);
  });
});
