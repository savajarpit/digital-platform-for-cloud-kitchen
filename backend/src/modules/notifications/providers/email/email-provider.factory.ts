import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailProvider as EmailProviderType,
  NotificationSettings,
} from '../../../../generated/prisma';
import { CryptoUtil } from '../../../../common/utils/crypto.util';
import { EmailProvider } from '../../interfaces/email-provider.interface';
import { SmtpProvider } from './smtp.provider';

interface TenantSmtpSecrets {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
}

/**
 * Resolves a tenant's own branded email sender. Returns null (never throws)
 * when the tenant hasn't set one up — NotificationsService falls back to
 * the platform's own SMTP (shared-modules/mail) in that case.
 */
@Injectable()
export class EmailProviderFactory {
  private readonly logger = new Logger(EmailProviderFactory.name);

  constructor(private readonly config: ConfigService) {}

  create(settings: NotificationSettings): EmailProvider | null {
    if (!settings.emailEnabled || !settings.emailProvider) return null;

    if (settings.emailProvider !== EmailProviderType.SMTP) {
      this.logger.warn(
        `Email provider "${settings.emailProvider}" isn't implemented yet — skipping`,
      );
      return null;
    }

    const encryptionKey = this.config.get<string>('app.encryptionKey');
    if (!settings.emailConfigEncrypted || !encryptionKey) {
      this.logger.warn(
        `Tenant ${settings.tenantId} has tenant email enabled but no SMTP config stored — skipping`,
      );
      return null;
    }

    const secrets = JSON.parse(
      CryptoUtil.decrypt(
        settings.emailConfigEncrypted as unknown as string,
        encryptionKey,
      ),
    ) as TenantSmtpSecrets;

    return new SmtpProvider({
      ...secrets,
      fromAddress:
        settings.emailFromAddress ?? secrets.user ?? 'no-reply@example.com',
      fromName: settings.emailFromName ?? 'Storefront',
    });
  }
}
