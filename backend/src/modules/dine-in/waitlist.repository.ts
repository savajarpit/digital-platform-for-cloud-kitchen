import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { WaitlistEntry, WaitlistStatus } from '../../generated/prisma';

@Injectable()
export class WaitlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tenantId: string,
    data: {
      kitchenZoneId: string;
      guestName?: string;
      guestPhone?: string;
      partySize: number;
    },
  ): Promise<WaitlistEntry> {
    return this.prisma.waitlistEntry.create({
      data: {
        tenantId,
        kitchenZoneId: data.kitchenZoneId,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        partySize: data.partySize,
      },
    });
  }

  findById(tenantId: string, id: string): Promise<WaitlistEntry | null> {
    return this.prisma.waitlistEntry.findFirst({ where: { id, tenantId } });
  }

  findActiveForTenant(
    tenantId: string,
    kitchenZoneId?: string,
  ): Promise<WaitlistEntry[]> {
    return this.prisma.waitlistEntry.findMany({
      where: {
        tenantId,
        status: WaitlistStatus.WAITING,
        ...(kitchenZoneId ? { kitchenZoneId } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  markSeated(id: string, seatedOrderId: string): Promise<WaitlistEntry> {
    return this.prisma.waitlistEntry.update({
      where: { id },
      data: {
        status: WaitlistStatus.SEATED,
        seatedAt: new Date(),
        seatedOrderId,
      },
    });
  }

  markCancelled(id: string): Promise<WaitlistEntry> {
    return this.prisma.waitlistEntry.update({
      where: { id },
      data: { status: WaitlistStatus.CANCELLED, cancelledAt: new Date() },
    });
  }
}
