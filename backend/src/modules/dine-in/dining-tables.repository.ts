import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { DiningTable, OrderStatus } from '../../generated/prisma';

// A table is "occupied" purely by having an active DINE_IN order pointed at
// it — never a stored status column, so there's nothing to keep in sync
// with the order lifecycle (see schema.prisma's DiningTable doc comment).
const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
];

export interface DiningTableWithStatus extends DiningTable {
  activeOrderId: string | null;
}

@Injectable()
export class DiningTablesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tenantId: string,
    data: { kitchenZoneId: string; label: string; capacity?: number },
  ): Promise<DiningTable> {
    return this.prisma.diningTable.create({
      data: {
        tenantId,
        kitchenZoneId: data.kitchenZoneId,
        label: data.label,
        capacity: data.capacity,
      },
    });
  }

  findById(tenantId: string, id: string): Promise<DiningTable | null> {
    return this.prisma.diningTable.findFirst({ where: { id, tenantId } });
  }

  async findAllForTenant(
    tenantId: string,
    kitchenZoneId?: string,
  ): Promise<DiningTableWithStatus[]> {
    const tables = await this.prisma.diningTable.findMany({
      where: { tenantId, ...(kitchenZoneId ? { kitchenZoneId } : {}) },
      orderBy: { label: 'asc' },
    });
    if (tables.length === 0) return [];

    const activeOrders = await this.prisma.order.findMany({
      where: {
        tenantId,
        tableId: { in: tables.map((t) => t.id) },
        status: { in: ACTIVE_ORDER_STATUSES },
      },
      select: { id: true, tableId: true },
    });
    const activeByTable = new Map(
      activeOrders.map((o) => [o.tableId as string, o.id]),
    );

    return tables.map((table) => ({
      ...table,
      activeOrderId: activeByTable.get(table.id) ?? null,
    }));
  }

  update(
    id: string,
    data: { label?: string; capacity?: number | null; isActive?: boolean },
  ): Promise<DiningTable> {
    return this.prisma.diningTable.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.diningTable.delete({ where: { id } });
  }

  countByLabel(
    tenantId: string,
    kitchenZoneId: string,
    label: string,
    excludeId?: string,
  ): Promise<number> {
    return this.prisma.diningTable.count({
      where: {
        tenantId,
        kitchenZoneId,
        label,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }
}
