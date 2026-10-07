import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WaitlistRepository } from './waitlist.repository';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { SettingsRepository } from '../settings/settings.repository';
import { WaitlistEntry, WaitlistStatus } from '../../generated/prisma';
import { WAITLIST_ALREADY_SEATED_MESSAGE } from './dine-in-rules';

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

  /**
   * Used by OrdersService.seatWaitlistEntry: reserves a WAITING party before
   * its order is opened, so two staff seating the same party at once can't
   * open two orders. Pair with releaseClaim (order failed) or markSeated
   * (order opened) — there is no bare "seat" action from a controller.
   */
  async claimForSeating(tenantId: string, id: string): Promise<WaitlistEntry> {
    const entry = await this.waitlistRepo.findById(tenantId, id);
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    const claimed = await this.waitlistRepo.claimForSeating(tenantId, id);
    if (!claimed) throw new ConflictException(WAITLIST_ALREADY_SEATED_MESSAGE);
    return entry;
  }

  releaseClaim(id: string): Promise<void> {
    return this.waitlistRepo.releaseClaim(id);
  }

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
