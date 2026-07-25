import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  NotificationSettings,
  WhatsappProvider as WhatsappProviderType,
} from '../../../../generated/prisma';
import { CryptoUtil } from '../../../../common/utils/crypto.util';
import { WhatsAppProvider } from '../../interfaces/whatsapp-provider.interface';
import { InteraktProvider } from './interakt.provider';

/**
 * Resolves a tenant's configured WhatsApp BSP into a ready-to-use provider
 * instance. Returns null (never throws) when WhatsApp isn't usable for this
 * tenant yet — callers treat that as "skip this channel", not an error.
 */
@Injectable()
export class WhatsAppProviderFactory {
  private readonly logger = new Logger(WhatsAppProviderFactory.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  create(settings: NotificationSettings): WhatsAppProvider | null {
    if (!settings.whatsappEnabled || !settings.whatsappProvider) return null;

    const encryptionKey = this.config.get<string>('app.encryptionKey');
    if (!settings.whatsappApiKeyEncrypted || !encryptionKey) {
      this.logger.warn(
        `Tenant ${settings.tenantId} has WhatsApp enabled but no API key configured — skipping`,
      );
      return null;
    }

    switch (settings.whatsappProvider) {
      case WhatsappProviderType.INTERAKT:
        return new InteraktProvider(this.httpService, {
          apiKey: CryptoUtil.decrypt(
            settings.whatsappApiKeyEncrypted,
            encryptionKey,
          ),
        });
      default:
        this.logger.warn(
          `WhatsApp provider "${settings.whatsappProvider}" isn't implemented yet — skipping`,
        );
        return null;
    }
  }
}
