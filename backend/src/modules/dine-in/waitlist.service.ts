import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WaitlistRepository } from './waitlist.repository';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { SettingsRepository } from '../settings/settings.repository';
import { WaitlistEntry, WaitlistStatus } from '../../generated/prisma';

@Injectable()
export class WaitlistService {
  constructor(
    private readonly waitlistRepo: WaitlistRepository,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  async create(
    tenantId: string,
    dto: CreateWaitlistEntryDto,
  ): Promise<WaitlistEntry> {
    const zone = await this.settingsRepo.findKitchenZoneById(
      tenantId,
      dto.kitchenZoneId,
    );
    if (!zone) throw new NotFoundException('Outlet not found');

    return this.waitlistRepo.create(tenantId, {
      kitchenZoneId: dto.kitchenZoneId,
      guestName: dto.guestName,
      guestPhone: dto.guestPhone,
      partySize: dto.partySize ?? 1,
    });
  }

  findActive(
    tenantId: string,
    kitchenZoneId?: string,
  ): Promise<WaitlistEntry[]> {
    return this.waitlistRepo.findActiveForTenant(tenantId, kitchenZoneId);
  }

  /** Used by OrdersService.seatWaitlistEntry — must still be WAITING. */
  async findWaitingForTenant(
    tenantId: string,
    id: string,
  ): Promise<WaitlistEntry | null> {
    const entry = await this.waitlistRepo.findById(tenantId, id);
    if (!entry || entry.status !== WaitlistStatus.WAITING) return null;
    return entry;
  }

  /** Called by OrdersService once the seating order is actually created —
   * never call this directly from a controller (there is no bare "seat"
   * action, only "seat + create the order"). */
  markSeated(id: string, seatedOrderId: string): Promise<WaitlistEntry> {
    return this.waitlistRepo.markSeated(id, seatedOrderId);
  }

  async cancel(tenantId: string, id: string): Promise<WaitlistEntry> {
    const entry = await this.waitlistRepo.findById(tenantId, id);
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    if (entry.status !== WaitlistStatus.WAITING) {
      throw new BadRequestException(
        'This waitlist entry is no longer waiting.',
      );
    }
    return this.waitlistRepo.markCancelled(id);
  }
}
