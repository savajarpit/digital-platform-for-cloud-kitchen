import { Injectable, Logger } from '@nestjs/common';
import { NotificationSettings } from '../../generated/prisma';
import { PrismaService } from '../../database/prisma/prisma.service';
import { MailService } from '../../shared-modules/mail/mail.service';
import { renderEmailShell } from '../../shared-modules/email-layout/email-layout.util';
import { getTenantEmailBranding } from '../../shared-modules/email-layout/tenant-branding.util';
import { PlatformEmailTemplateService } from '../../shared-modules/notification-templates/platform-email-template.service';
import { TenantNotificationTemplateService } from '../../shared-modules/notification-templates/tenant-notification-template.service';
import { PlatformWhatsAppTemplateService } from '../../shared-modules/notification-templates/platform-whatsapp-template.service';
import { PlatformSettingsService } from '../../shared-modules/platform-settings/platform-settings.service';
import { WhatsAppProviderFactory } from './providers/whatsapp/whatsapp-provider.factory';
import { EmailProviderFactory } from './providers/email/email-provider.factory';
import { OrderConfirmationTemplateData } from './templates/email/order-confirmation-customer.template';
import { orderConfirmationCustomerWhatsAppTemplate } from './templates/whatsapp/order-confirmation-customer.template';
import { orderConfirmationOwnerWhatsAppTemplate } from './templates/whatsapp/order-confirmation-owner.template';
import { SubscriptionDisruptionTemplateData } from './templates/email/subscription-disruption.template';
import { subscriptionDisruptionWhatsAppTemplate } from './templates/whatsapp/subscription-disruption.template';

export interface SendOtpParams {
  tenantId: string;
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
    private readonly prisma: PrismaService,
    private readonly platformEmailTemplates: PlatformEmailTemplateService,
    private readonly tenantEmailTemplates: TenantNotificationTemplateService,
    private readonly whatsAppTemplates: PlatformWhatsAppTemplateService,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  /**
   * Signup OTP delivery (§4B): email always; WhatsApp additionally, but
   * only when BOTH the tenant has WhatsApp configured AND SUPER_ADMIN has
   * flipped the platform-wide `whatsappOtpEnabled` kill-switch on (off by
   * default — WhatsApp OTP isn't trusted/approved yet, so every tenant is
   * email-only for OTP until this is enabled, regardless of their own
   * WhatsApp setup). Order-confirmation/subscription-disruption WhatsApp
   * sends are untouched by this switch — those stay purely per-tenant.
   */
  async sendOtp(
    settings: NotificationSettings | null,
    params: SendOtpParams,
  ): Promise<void> {
    const sends: Promise<void>[] = [this.sendOtpEmail(settings, params)];
    if (
      settings?.whatsappEnabled &&
      (await this.platformSettings.isWhatsAppOtpEnabled())
    ) {
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
      const templateKey = await this.whatsAppTemplates.resolveTemplateKey(
        'signup-otp',
        'signup_otp',
      );
      await provider.sendTemplateMessage({
        to: params.recipientWhatsAppNumber,
        templateKey,
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
    const branding = await getTenantEmailBranding(this.prisma, params.tenantId);
    // OTP is never tenant-overridable, any role — always the SUPER_ADMIN
    // platform-default wording, just wrapped in the tenant's own branding.
    const { subject, html: innerHtml } =
      await this.platformEmailTemplates.render('otp', {
        name: params.recipientName,
        otp: params.otp,
        businessName: branding.businessName,
      });
    const html = renderEmailShell({
      brandName: branding.businessName,
      brandLogoUrl: branding.logoUrl,
      bodyHtml: innerHtml,
      ownerLine: branding.businessName,
      showPoweredBy: branding.showPoweredBy,
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

  private buildOrderConfirmationTokens(
    params: OrderConfirmationParams,
  ): Record<string, string> {
    const itemsHtml = params.items
      .map(
        (item) =>
          `<tr><td style="padding:4px 0;">${item.name} × ${item.quantity}</td></tr>`,
      )
      .join('');
    const total = (params.totalInPaise / 100).toFixed(2);
    const mapLinkHtml = params.mapLink
      ? ` — <a href="${params.mapLink}" style="color:#16a34a;"><strong>Get directions</strong></a>`
      : '';
    return {
      customerName: params.customerName,
      orderNumber: params.orderNumber,
      total,
      itemsHtml,
      deliverySlotName: params.deliverySlotName,
      deliveryWindowStart: params.deliveryWindowStart,
      deliveryWindowEnd: params.deliveryWindowEnd,
      deliveryDateLabel: params.deliveryDateLabel,
      deliveryAddress: params.deliveryAddress,
      deliveryContactPhone: params.deliveryContactPhone,
      mapLinkHtml,
    };
  }

  /**
   * Fired once per confirmed order. Unlike sendOtp, this is fully gated by
   * each tenant toggle (whatsappEnabled/emailEnabled) — a tenant with
   * neither configured yet gets no order notifications at all, which is a
   * business-config gap, not a system failure worth forcing a fallback for.
   * Every attempt (success or failure) is collected and returned so the
   * caller can persist it to NotificationLog — this service has no DB
   * access of its own for that part.
   */
  async sendOrderConfirmation(
    settings: NotificationSettings | null,
    params: OrderConfirmationParams,
  ): Promise<NotificationAttempt[]> {
    const attempts: NotificationAttempt[] = [];
    if (!settings) return attempts;

    const tokens = this.buildOrderConfirmationTokens(params);
    const branding = await getTenantEmailBranding(
      this.prisma,
      settings.tenantId,
    );
    const tasks: Promise<void>[] = [];

    if (settings.whatsappEnabled && params.customerWhatsAppNumber) {
      tasks.push(
        this.trySendWhatsAppFromDefault(
          settings,
          'order-confirmation-customer',
          orderConfirmationCustomerWhatsAppTemplate(params),
          'CUSTOMER',
          params.customerWhatsAppNumber,
          attempts,
        ),
      );
    }
    if (settings.whatsappEnabled && settings.ownerWhatsappNumber) {
      tasks.push(
        this.trySendWhatsAppFromDefault(
          settings,
          'order-confirmation-owner',
          orderConfirmationOwnerWhatsAppTemplate(params),
          'OWNER',
          settings.ownerWhatsappNumber,
          attempts,
        ),
      );
    }
    if (settings.emailEnabled) {
      tasks.push(
        (async () => {
          const rendered = await this.tenantEmailTemplates.renderEmail(
            settings.tenantId,
            'order-confirmation-customer',
            { ...tokens, businessName: branding.businessName },
          );
          await this.trySendEmail(
            settings,
            'CUSTOMER',
            params.customerEmail,
            {
              subject: rendered.subject,
              html: renderEmailShell({
                brandName: branding.businessName,
                brandLogoUrl: branding.logoUrl,
                bodyHtml: rendered.html,
                ownerLine: branding.businessName,
                showPoweredBy: branding.showPoweredBy,
              }),
            },
            attempts,
          );
        })(),
      );
      if (settings.ownerNotificationEmail) {
        tasks.push(
          (async () => {
            const rendered = await this.platformEmailTemplates.render(
              'order-confirmation-owner',
              tokens,
            );
            await this.trySendEmail(
              settings,
              'OWNER',
              settings.ownerNotificationEmail as string,
              {
                subject: rendered.subject,
                html: renderEmailShell({
                  brandName: branding.businessName,
                  brandLogoUrl: branding.logoUrl,
                  bodyHtml: rendered.html,
                  ownerLine: branding.businessName,
                  showPoweredBy: branding.showPoweredBy,
                }),
              },
              attempts,
            );
          })(),
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

    const dayWord = params.compensationDays === 1 ? 'day' : 'days';
    const tokens = {
      customerName: params.customerName,
      planName: params.planName,
      dateLabel: params.dateLabel,
      reason: params.reason,
      compensationDays: String(params.compensationDays),
      dayWord,
    };
    const branding = await getTenantEmailBranding(
      this.prisma,
      settings.tenantId,
    );
    const tasks: Promise<void>[] = [];

    if (settings.whatsappEnabled && params.customerWhatsAppNumber) {
      tasks.push(
        this.trySendWhatsAppFromDefault(
          settings,
          'subscription-disruption',
          subscriptionDisruptionWhatsAppTemplate(params),
          'CUSTOMER',
          params.customerWhatsAppNumber,
          attempts,
        ),
      );
    }
    if (settings.emailEnabled) {
      tasks.push(
        (async () => {
          const rendered = await this.platformEmailTemplates.render(
            'subscription-disruption',
            tokens,
          );
          await this.trySendEmail(
            settings,
            'CUSTOMER',
            params.customerEmail,
            {
              subject: rendered.subject,
              html: renderEmailShell({
                brandName: branding.businessName,
                brandLogoUrl: branding.logoUrl,
                bodyHtml: rendered.html,
                ownerLine: branding.businessName,
                showPoweredBy: branding.showPoweredBy,
              }),
            },
            attempts,
          );
        })(),
      );
    }

    await Promise.all(tasks);
    return attempts;
  }

  /** WhatsApp params are computed by the existing per-key template
   * functions (correct order/values for the real approved template) — only
   * the template *name* is swapped for whatever SUPER_ADMIN has registered,
   * never the param order (see PlatformWhatsAppTemplateService). */
  private async trySendWhatsAppFromDefault(
    settings: NotificationSettings,
    key: string,
    template: { templateKey: string; params: Record<string, string> },
    recipientType: NotificationRecipientType,
    to: string,
    attempts: NotificationAttempt[],
  ): Promise<void> {
    const templateKey = await this.whatsAppTemplates.resolveTemplateKey(
      key,
      template.templateKey,
    );
    await this.trySendWhatsApp(
      settings,
      recipientType,
      to,
      { templateKey, params: template.params },
      attempts,
    );
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
