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
import { TwilioProvider } from './twilio.provider';
import { AiSensyProvider } from './aisensy.provider';

interface TwilioSecrets {
  accountSid: string;
  /** Optional templateKey → Twilio Content Template SID (`HX…`) map — see
   * TwilioProviderConfig.contentSids. Stored inside the same encrypted
   * whatsappConfig blob as accountSid. */
  contentSids?: Record<string, string>;
}

interface AiSensySecrets {
  /** templateKey → AiSensy Campaign name. See AiSensyProviderConfig. */
  campaignNames: Record<string, string>;
}

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
        `Tenant ${settings.tenantId} has WhatsApp enabled but no API key/token configured — skipping`,
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

      case WhatsappProviderType.TWILIO: {
        if (
          !settings.whatsappConfigEncrypted ||
          !settings.whatsappSenderNumber
        ) {
          this.logger.warn(
            `Tenant ${settings.tenantId} selected Twilio but is missing the Account SID or sender number — skipping`,
          );
          return null;
        }
        const secrets = JSON.parse(
          CryptoUtil.decrypt(
            settings.whatsappConfigEncrypted as unknown as string,
            encryptionKey,
          ),
        ) as TwilioSecrets;
        return new TwilioProvider(this.httpService, {
          accountSid: secrets.accountSid,
          authToken: CryptoUtil.decrypt(
            settings.whatsappApiKeyEncrypted,
            encryptionKey,
          ),
          senderNumber: settings.whatsappSenderNumber,
          contentSids: secrets.contentSids,
        });
      }

      case WhatsappProviderType.AISENSY: {
        if (!settings.whatsappConfigEncrypted) {
          this.logger.warn(
            `Tenant ${settings.tenantId} selected AiSensy but has no campaign config stored — skipping`,
          );
          return null;
        }
        const secrets = JSON.parse(
          CryptoUtil.decrypt(
            settings.whatsappConfigEncrypted as unknown as string,
            encryptionKey,
          ),
        ) as AiSensySecrets;
        return new AiSensyProvider(this.httpService, {
          apiKey: CryptoUtil.decrypt(
            settings.whatsappApiKeyEncrypted,
            encryptionKey,
          ),
          campaignNames: secrets.campaignNames ?? {},
        });
      }

      default:
        this.logger.warn(
          `WhatsApp provider "${settings.whatsappProvider}" isn't implemented yet — skipping`,
        );
        return null;
    }
  }
}
