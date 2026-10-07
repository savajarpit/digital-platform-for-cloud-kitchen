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

  /** Atomically flips WAITING → SEATED; false when another request got
   * there first (two staff tapping "Seat" at once). */
  async claimForSeating(tenantId: string, id: string): Promise<boolean> {
    const { count } = await this.prisma.waitlistEntry.updateMany({
      where: { id, tenantId, status: WaitlistStatus.WAITING },
      data: { status: WaitlistStatus.SEATED, seatedAt: new Date() },
    });
    return count === 1;
  }

  /** Undoes claimForSeating when the order couldn't be opened. */
  async releaseClaim(id: string): Promise<void> {
    await this.prisma.waitlistEntry.updateMany({
      where: { id, status: WaitlistStatus.SEATED, seatedOrderId: null },
      data: { status: WaitlistStatus.WAITING, seatedAt: null },
    });
  }

  markSeated(id: string, seatedOrderId: string): Promise<WaitlistEntry> {
    return this.prisma.waitlistEntry.update({
      where: { id },
      data: { seatedOrderId },
    });
  }

  markCancelled(id: string): Promise<WaitlistEntry> {
    return this.prisma.waitlistEntry.update({
      where: { id },
      data: { status: WaitlistStatus.CANCELLED, cancelledAt: new Date() },
    });
  }
}
