import { Injectable, Logger } from '@nestjs/common';
import { NotificationSettings } from '../../generated/prisma';
import { MailService } from '../../shared-modules/mail/mail.service';
import { WhatsAppProviderFactory } from './providers/whatsapp/whatsapp-provider.factory';
import { EmailProviderFactory } from './providers/email/email-provider.factory';
import { otpEmailTemplate } from './templates/email/otp.template';
import {
  orderConfirmationCustomerEmailTemplate,
  OrderConfirmationTemplateData,
} from './templates/email/order-confirmation-customer.template';
import { orderConfirmationOwnerEmailTemplate } from './templates/email/order-confirmation-owner.template';
import { orderConfirmationCustomerWhatsAppTemplate } from './templates/whatsapp/order-confirmation-customer.template';
import { orderConfirmationOwnerWhatsAppTemplate } from './templates/whatsapp/order-confirmation-owner.template';
import {
  subscriptionDisruptionEmailTemplate,
  SubscriptionDisruptionTemplateData,
} from './templates/email/subscription-disruption.template';
import { subscriptionDisruptionWhatsAppTemplate } from './templates/whatsapp/subscription-disruption.template';

export interface SendOtpParams {
  recipientEmail: string;
  recipientName: string;
  recipientWhatsAppNumber?: string;
  otp: string;
}

export interface OrderConfirmationParams extends OrderConfirmationTemplateData {
  customerEmail: string;
  customerWhatsAppNumber?: string;
}

export interface SubscriptionDisruptionParams extends SubscriptionDisruptionTemplateData {
  customerEmail: string;
  customerWhatsAppNumber?: string;
}

export type NotificationChannel = 'WHATSAPP' | 'EMAIL';
export type NotificationRecipientType = 'CUSTOMER' | 'OWNER';

export interface NotificationAttempt {
  channel: NotificationChannel;
  recipientType: NotificationRecipientType;
  recipient: string;
  status: 'SENT' | 'FAILED';
  providerMessageId?: string;
  errorMessage?: string;
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

  /**
   * Fired once per confirmed order. Unlike sendOtp, this is fully gated by
   * each tenant toggle (whatsappEnabled/emailEnabled) — a tenant with
   * neither configured yet gets no order notifications at all, which is a
   * business-config gap, not a system failure worth forcing a fallback for.
   * Every attempt (success or failure) is collected and returned so the
   * caller can persist it to NotificationLog — this service has no DB
   * access of its own.
   */
  async sendOrderConfirmation(
    settings: NotificationSettings | null,
    params: OrderConfirmationParams,
  ): Promise<NotificationAttempt[]> {
    const attempts: NotificationAttempt[] = [];
    if (!settings) return attempts;

    const tasks: Promise<void>[] = [];

    if (settings.whatsappEnabled && params.customerWhatsAppNumber) {
      tasks.push(
        this.trySendWhatsApp(
          settings,
          'CUSTOMER',
          params.customerWhatsAppNumber,
          orderConfirmationCustomerWhatsAppTemplate(params),
          attempts,
        ),
      );
    }
    if (settings.whatsappEnabled && settings.ownerWhatsappNumber) {
      tasks.push(
        this.trySendWhatsApp(
          settings,
          'OWNER',
          settings.ownerWhatsappNumber,
          orderConfirmationOwnerWhatsAppTemplate(params),
          attempts,
        ),
      );
    }
    if (settings.emailEnabled) {
      tasks.push(
        this.trySendEmail(
          settings,
          'CUSTOMER',
          params.customerEmail,
          orderConfirmationCustomerEmailTemplate(params),
          attempts,
        ),
      );
      if (settings.ownerNotificationEmail) {
        tasks.push(
          this.trySendEmail(
            settings,
            'OWNER',
            settings.ownerNotificationEmail,
            orderConfirmationOwnerEmailTemplate(params),
            attempts,
          ),
        );
      }
    }

    await Promise.all(tasks);
    return attempts;
  }

  /**
   * Fired once per subscriber affected by a tenant-declared disruption
   * (see SubscriptionDisruptionService) — customer-only, no owner copy,
   * unlike sendOrderConfirmation's dual-send (the tenant is the one who
   * declared the disruption, they don't need a copy of their own notice).
   */
  async sendSubscriptionDisruptionNotice(
    settings: NotificationSettings | null,
    params: SubscriptionDisruptionParams,
  ): Promise<NotificationAttempt[]> {
    const attempts: NotificationAttempt[] = [];
    if (!settings) return attempts;

    const tasks: Promise<void>[] = [];

    if (settings.whatsappEnabled && params.customerWhatsAppNumber) {
      tasks.push(
        this.trySendWhatsApp(
          settings,
          'CUSTOMER',
          params.customerWhatsAppNumber,
          subscriptionDisruptionWhatsAppTemplate(params),
          attempts,
        ),
      );
    }
    if (settings.emailEnabled) {
      tasks.push(
        this.trySendEmail(
          settings,
          'CUSTOMER',
          params.customerEmail,
          subscriptionDisruptionEmailTemplate(params),
          attempts,
        ),
      );
    }

    await Promise.all(tasks);
    return attempts;
  }

  private async trySendWhatsApp(
    settings: NotificationSettings,
    recipientType: NotificationRecipientType,
    to: string,
    template: { templateKey: string; params: Record<string, string> },
    attempts: NotificationAttempt[],
  ): Promise<void> {
    try {
      const provider = this.whatsAppFactory.create(settings);
      if (!provider) return;
      const result = await provider.sendTemplateMessage({
        to,
        templateKey: template.templateKey,
        params: template.params,
      });
      attempts.push({
        channel: 'WHATSAPP',
        recipientType,
        recipient: to,
        status: 'SENT',
        providerMessageId: result.providerMessageId,
      });
    } catch (error) {
      this.logger.error(
        `WhatsApp order-confirmation send failed for ${to}`,
        (error as Error).stack,
      );
      attempts.push({
        channel: 'WHATSAPP',
        recipientType,
        recipient: to,
        status: 'FAILED',
        errorMessage: (error as Error).message,
      });
    }
  }

  private async trySendEmail(
    settings: NotificationSettings,
    recipientType: NotificationRecipientType,
    to: string,
    template: { subject: string; html: string },
    attempts: NotificationAttempt[],
  ): Promise<void> {
    try {
      const provider = this.emailFactory.create(settings);
      let providerMessageId: string | undefined;
      if (provider) {
        const result = await provider.sendMail({
          to,
          subject: template.subject,
          html: template.html,
        });
        providerMessageId = result.providerMessageId;
      } else {
        await this.mailService.send(to, template.subject, template.html);
      }

      attempts.push({
        channel: 'EMAIL',
        recipientType,
        recipient: to,
        status: 'SENT',
        providerMessageId,
      });
    } catch (error) {
      this.logger.error(
        `Email order-confirmation send failed for ${to}`,
        (error as Error).stack,
      );
      attempts.push({
        channel: 'EMAIL',
        recipientType,
        recipient: to,
        status: 'FAILED',
        errorMessage: (error as Error).message,
      });
    }
  }
}
