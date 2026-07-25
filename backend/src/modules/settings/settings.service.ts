import { Injectable, NotFoundException } from '@nestjs/common';
import { SettingsRepository } from './settings.repository';
import {
  PublicConfigResponseDto,
  ThemeConfigDto,
} from './dto/public-config-response.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepo: SettingsRepository) {}

  async getPublicConfig(tenantId: string): Promise<PublicConfigResponseDto> {
    const profile = await this.settingsRepo.findBusinessProfile(tenantId);
    if (!profile) {
      throw new NotFoundException('Business profile not configured yet');
    }

    return new PublicConfigResponseDto({
      displayName: profile.displayName,
      logoUrl: profile.logoUrl ?? undefined,
      faviconUrl: profile.faviconUrl ?? undefined,
      themeConfig: this.parseThemeConfig(profile.themeConfig),
      defaultLocale: profile.defaultLocale,
      currency: profile.currency,
    });
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
