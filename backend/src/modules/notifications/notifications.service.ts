import { Injectable, Logger } from '@nestjs/common';
import { NotificationSettings } from '../../generated/prisma';
import { MailService } from '../../shared-modules/mail/mail.service';
import { WhatsAppProviderFactory } from './providers/whatsapp/whatsapp-provider.factory';
import { EmailProviderFactory } from './providers/email/email-provider.factory';
import { otpEmailTemplate } from './templates/email/otp.template';

export interface SendOtpParams {
  recipientEmail: string;
  recipientName: string;
  recipientWhatsAppNumber?: string;
  otp: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly whatsAppFactory: WhatsAppProviderFactory,
    private readonly emailFactory: EmailProviderFactory,
    private readonly mailService: MailService,
  ) {}

  /**
   * Signup OTP delivery (§4B): WhatsApp when the tenant has it configured,
   * always email too — the tenant's own sender if configured, otherwise the
   * platform's own SMTP, so signup never depends on tenant setup being done.
   * Both channels carry the same code; the customer only needs to see one.
   */
  async sendOtp(
    settings: NotificationSettings | null,
    params: SendOtpParams,
  ): Promise<void> {
    const sends: Promise<void>[] = [this.sendOtpEmail(settings, params)];
    if (settings?.whatsappEnabled) {
      sends.push(this.sendOtpWhatsApp(settings, params));
    }

    // Email is the guaranteed channel and must throw on failure; WhatsApp is
    // best-effort and swallows its own errors — a broken BSP config should
    // never block signup.
    await Promise.all(sends);
  }

  private async sendOtpWhatsApp(
    settings: NotificationSettings,
    params: SendOtpParams,
  ): Promise<void> {
    if (!params.recipientWhatsAppNumber) return;
    try {
      const provider = this.whatsAppFactory.create(settings);
      if (!provider) return;
      await provider.sendTemplateMessage({
        to: params.recipientWhatsAppNumber,
        templateKey: 'signup_otp',
        params: { name: params.recipientName, otp: params.otp },
      });
    } catch (error) {
      this.logger.error(
        `WhatsApp OTP send failed for ${params.recipientEmail}`,
        (error as Error).stack,
      );
    }
  }

  private async sendOtpEmail(
    settings: NotificationSettings | null,
    params: SendOtpParams,
  ): Promise<void> {
    const { subject, html } = otpEmailTemplate({
      name: params.recipientName,
      otp: params.otp,
    });

    const tenantProvider = settings ? this.emailFactory.create(settings) : null;
    if (tenantProvider) {
      await tenantProvider.sendMail({
        to: params.recipientEmail,
        subject,
        html,
      });
      return;
    }
    await this.mailService.send(params.recipientEmail, subject, html);
  }
}
