import { Injectable, NotFoundException } from '@nestjs/common';
import { SettingsRepository } from './settings.repository';
import { DeliverySlot } from '../../generated/prisma';
import {
  PublicConfigResponseDto,
  ThemeConfigDto,
} from './dto/public-config-response.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepo: SettingsRepository) {}

  async getPublicConfig(
    tenantId: string | undefined,
  ): Promise<PublicConfigResponseDto> {
    if (!tenantId) {
      // No tenant resolved for this request (e.g. hit from the platform
      // admin host, which isn't tied to any single tenant).
      throw new NotFoundException('No tenant context for this request');
    }

    const profile = await this.settingsRepo.findBusinessProfile(tenantId);
    if (!profile) {
      throw new NotFoundException('Business profile not configured yet');
    }

    return new PublicConfigResponseDto({
      displayName: profile.displayName,
      logoUrl: profile.logoUrl ?? undefined,
      faviconUrl: profile.faviconUrl ?? undefined,
      heroImageUrl: profile.heroImageUrl ?? undefined,
      themeConfig: this.parseThemeConfig(profile.themeConfig),
      defaultLocale: profile.defaultLocale,
      currency: profile.currency,
      supportEmail: profile.supportEmail ?? undefined,
      supportPhone: profile.supportPhone ?? undefined,
      addressLine1: profile.addressLine1 ?? undefined,
      maxAdvanceOrderDays: profile.maxAdvanceOrderDays,
    });
  }

  async getDeliverySlots(
    tenantId: string,
  ): Promise<{ maxAdvanceOrderDays: number; slots: DeliverySlot[] }> {
    const [profile, slots] = await Promise.all([
      this.settingsRepo.findBusinessProfile(tenantId),
      this.settingsRepo.findActiveDeliverySlots(tenantId),
    ]);
    return { maxAdvanceOrderDays: profile?.maxAdvanceOrderDays ?? 2, slots };
  }

  private parseThemeConfig(raw: unknown): ThemeConfigDto {
    const config = new ThemeConfigDto();
    if (!raw || typeof raw !== 'object') return config;

    const record = raw as Record<string, unknown>;
    if (typeof record.primaryColor === 'string') {
      config.primaryColor = record.primaryColor;
    }
    if (typeof record.secondaryColor === 'string') {
      config.secondaryColor = record.secondaryColor;
    }
    if (typeof record.accentColor === 'string') {
      config.accentColor = record.accentColor;
    }
    return config;
  }
}
