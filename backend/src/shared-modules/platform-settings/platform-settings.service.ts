import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformSettingsRepository } from './platform-settings.repository';
import { MapsProvider } from '../../generated/prisma';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { redactPlatformSettings } from '../../common/utils/settings-redaction.util';

export interface UpdatePlatformSettingsInput {
  whatsappOtpEnabled?: boolean;
  mapsProvider?: MapsProvider;
  /** Plaintext — encrypted before it ever reaches the repository/DB. */
  googleMapsApiKey?: string;
}

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly repo: PlatformSettingsRepository,
    private readonly config: ConfigService,
  ) {}

  async getSettings() {
    const settings = await this.repo.findOrCreate();
    return redactPlatformSettings(settings);
  }

  update(dto: UpdatePlatformSettingsInput, userId: string) {
    const { googleMapsApiKey, ...rest } = dto;
    const encryptionKey = this.config.get<string>('app.encryptionKey');

    return this.repo
      .update({
        ...rest,
        updatedByUserId: userId,
        ...(googleMapsApiKey && encryptionKey
          ? {
              googleMapsApiKeyEncrypted: CryptoUtil.encrypt(
                googleMapsApiKey,
                encryptionKey,
              ),
            }
          : {}),
      })
      .then((settings) => redactPlatformSettings(settings));
  }

  /** The one thing NotificationsService actually needs — kept as its own
   * method so a caller that only cares about this doesn't need to know the
   * shape of the whole settings row. */
  async isWhatsAppOtpEnabled(): Promise<boolean> {
    const settings = await this.repo.findOrCreate();
    return settings.whatsappOtpEnabled;
  }

  /**
   * The decrypted map config, for SettingsService.getPublicConfig to embed
   * in the storefront's public-config response. Unlike every other secret
   * this module touches, the Google Maps key is *meant* to reach the
   * browser — it authorizes client-side Maps/Places calls and is restricted
   * by HTTP-referrer rules in the Google Cloud Console, not by staying
   * server-side. Returns no key at all when the provider is OSM (nothing to
   * leak) or when the key was never configured.
   */
  async getMapsConfig(): Promise<{
    mapsProvider: 'google' | 'osm';
    googleMapsApiKey?: string;
  }> {
    const settings = await this.repo.findOrCreate();
    const mapsProvider =
      settings.mapsProvider === MapsProvider.GOOGLE ? 'google' : 'osm';
    const encryptionKey = this.config.get<string>('app.encryptionKey');
    if (
      mapsProvider !== 'google' ||
      !settings.googleMapsApiKeyEncrypted ||
      !encryptionKey
    ) {
      return { mapsProvider };
    }
    return {
      mapsProvider,
      googleMapsApiKey: CryptoUtil.decrypt(
        settings.googleMapsApiKeyEncrypted,
        encryptionKey,
      ),
    };
  }
}
