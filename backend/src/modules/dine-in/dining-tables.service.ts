import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DiningTablesRepository,
  DiningTableWithStatus,
} from './dining-tables.repository';
import { CreateDiningTableDto } from './dto/create-dining-table.dto';
import { UpdateDiningTableDto } from './dto/update-dining-table.dto';
import { SettingsRepository } from '../settings/settings.repository';
import { DiningTable } from '../../generated/prisma';
import {
  compareTableLabels,
  tableBusyMessage,
  tableInUseMessage,
} from './dine-in-rules';

@Injectable()
export class DiningTablesService {
  constructor(
    private readonly tablesRepo: DiningTablesRepository,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  async create(
    tenantId: string,
    dto: CreateDiningTableDto,
  ): Promise<DiningTable> {
    const zone = await this.settingsRepo.findKitchenZoneById(
      tenantId,
      dto.kitchenZoneId,
    );
    if (!zone) throw new NotFoundException('Outlet not found');

    const existing = await this.tablesRepo.countByLabel(
      tenantId,
      dto.kitchenZoneId,
      dto.label,
    );
    if (existing > 0) {
      throw new BadRequestException(
        `A table named "${dto.label}" already exists at this outlet.`,
      );
    }

    return this.tablesRepo.create(tenantId, {
      kitchenZoneId: dto.kitchenZoneId,
      label: dto.label,
      capacity: dto.capacity,
    });
  }

  async findAllForTenant(
    tenantId: string,
    kitchenZoneId?: string,
  ): Promise<DiningTableWithStatus[]> {
    const tables = await this.tablesRepo.findAllForTenant(
      tenantId,
      kitchenZoneId,
    );
    return tables.sort((a, b) => compareTableLabels(a.label, b.label));
  }

  /** One open bill per table — seating, opening or moving an order onto a
   * table that already has one is refused. `exceptOrderId` is the order
   * being moved, so it never blocks itself. */
  async assertTableFree(
    tenantId: string,
    table: DiningTable,
    exceptOrderId?: string,
  ): Promise<void> {
    const busyWith = await this.tablesRepo.findActiveOrderId(
      tenantId,
      table.id,
      exceptOrderId,
    );
    if (busyWith) throw new ConflictException(tableBusyMessage(table.label));
  }

  /** Used by OrdersService to validate a table before assigning/seating —
   * must belong to the given outlet and still be active. */
  async findActiveForTenant(
    tenantId: string,
    id: string,
    kitchenZoneId: string,
  ): Promise<DiningTable | null> {
    const table = await this.tablesRepo.findById(tenantId, id);
    if (!table || !table.isActive || table.kitchenZoneId !== kitchenZoneId)
      return null;
    return table;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateDiningTableDto,
  ): Promise<DiningTable> {
    const table = await this.tablesRepo.findById(tenantId, id);
    if (!table) throw new NotFoundException('Table not found');

    if (dto.label && dto.label !== table.label) {
      const existing = await this.tablesRepo.countByLabel(
        tenantId,
        table.kitchenZoneId,
        dto.label,
        id,
      );
      if (existing > 0) {
        throw new BadRequestException(
          `A table named "${dto.label}" already exists at this outlet.`,
        );
      }
    }

    if (dto.isActive === false && table.isActive) {
      await this.assertNoOpenOrder(tenantId, table, 'deactivate');
    }

    return this.tablesRepo.update(id, {
      label: dto.label,
      capacity: dto.capacity,
      isActive: dto.isActive,
    });
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const table = await this.tablesRepo.findById(tenantId, id);
    if (!table) throw new NotFoundException('Table not found');
    await this.assertNoOpenOrder(tenantId, table, 'remove');
    // Safe even with order history — Order.tableId is ON DELETE SET NULL and
    // tableLabelSnapshot already froze the table's name on every past order.
    await this.tablesRepo.delete(id);
  }

  /** A seated party's bill must never lose its table mid-meal. */
  private async assertNoOpenOrder(
    tenantId: string,
    table: DiningTable,
    action: 'deactivate' | 'remove',
  ): Promise<void> {
    const openOrder = await this.tablesRepo.findActiveOrderId(
      tenantId,
      table.id,
    );
    if (openOrder) {
      throw new ConflictException(tableInUseMessage(table.label, action));
    }
  }
}
