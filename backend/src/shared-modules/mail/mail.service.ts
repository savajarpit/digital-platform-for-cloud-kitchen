import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformEmailTemplateService } from '../notification-templates/platform-email-template.service';
import { renderEmailShell } from '../email-layout/email-layout.util';
import { getTenantEmailBranding } from '../email-layout/tenant-branding.util';
import { WelcomeTemplateData } from './templates/welcome.template';
import { ResetPasswordTemplateData } from './templates/reset-password.template';
import { PlatformActivationInviteTemplateData } from './templates/platform-activation-invite.template';
import { PlatformInvoiceTemplateData } from './templates/platform-invoice.template';
import { PlatformPaymentFailedTemplateData } from './templates/platform-payment-failed.template';
import { PlatformLimitAlertTemplateData } from './templates/platform-limit-alert.template';
import { PlatformLeadNotificationTemplateData } from './templates/platform-lead-notification.template';
import { PlatformWebhookFailedTemplateData } from './templates/platform-webhook-failed.template';
import { PlatformCancellationRequestTemplateData } from './templates/platform-cancellation-request.template';

const OKAYSYNC_BRAND = 'OkaySync';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly fromAddress: string;
  private readonly fromName: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly templates: PlatformEmailTemplateService,
  ) {
    this.fromAddress = this.config.get<string>('mail.fromAddress') as string;
    this.fromName = this.config.get<string>('mail.fromName') as string;

    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('mail.host'),
      port: this.config.get<number>('mail.port'),
      secure: this.config.get<boolean>('mail.secure'),
      auth: this.config.get<string>('mail.user')
        ? {
            user: this.config.get<string>('mail.user'),
            pass: this.config.get<string>('mail.password'),
          }
        : undefined,
    });
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromAddress}>`,
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(`Failed to send mail to ${to}`, (error as Error).stack);
      throw error;
    }
  }

  private async sendCustomerFacing(
    to: string,
    tenantId: string,
    key: string,
    data: Record<string, string>,
  ): Promise<void> {
    const branding = await getTenantEmailBranding(this.prisma, tenantId);
    const { subject, html: innerHtml } = await this.templates.render(key, {
      ...data,
      businessName: branding.businessName,
    });
    const html = renderEmailShell({
      brandName: branding.businessName,
      brandLogoUrl: branding.logoUrl,
      bodyHtml: innerHtml,
      ownerLine: branding.businessName,
      showPoweredBy: branding.showPoweredBy,
    });
    await this.send(to, subject, html);
  }

  private async sendPlatformOps(
    to: string,
    key: string,
    data: Record<string, string>,
  ): Promise<void> {
    const { subject, html: innerHtml } = await this.templates.render(key, data);
    const html = renderEmailShell({
      brandName: OKAYSYNC_BRAND,
      bodyHtml: innerHtml,
      ownerLine: null,
      showPoweredBy: true,
    });
    await this.send(to, subject, html);
  }

  async sendWelcome(
    to: string,
    tenantId: string,
    data: WelcomeTemplateData,
  ): Promise<void> {
    await this.sendCustomerFacing(to, tenantId, 'welcome', {
      firstName: data.firstName,
    });
  }

  async sendResetPassword(
    to: string,
    tenantId: string,
    data: ResetPasswordTemplateData,
  ): Promise<void> {
    await this.sendCustomerFacing(to, tenantId, 'reset-password', {
      resetUrl: data.resetUrl,
    });
  }

  async sendPlatformActivationInvite(
    to: string,
    data: PlatformActivationInviteTemplateData,
  ): Promise<void> {
    await this.sendPlatformOps(to, 'platform-activation-invite', {
      businessName: data.businessName,
      activationUrl: data.activationUrl,
      planCode: data.planCode,
      amount: (data.amountInPaise / 100).toFixed(2),
      cycle: data.billingCycle === 'MONTHLY' ? 'month' : 'year',
    });
  }

  async sendPlatformInvoice(
    to: string,
    data: PlatformInvoiceTemplateData,
  ): Promise<void> {
    const invoiceLinkHtml = data.invoiceUrl
      ? `<p style="margin:0;"><a href="${data.invoiceUrl}">View your invoice</a></p>`
      : '';
    await this.sendPlatformOps(to, 'platform-invoice', {
      businessName: data.businessName,
      amount: (data.amountInPaise / 100).toFixed(2),
      invoiceLinkHtml,
    });
  }

  async sendPlatformPaymentFailed(
    to: string,
    data: PlatformPaymentFailedTemplateData,
  ): Promise<void> {
    const amount = (data.amountInPaise / 100).toFixed(2);
    const recipientNote = data.isOwnerRecipient
      ? `Your platform subscription payment of ₹${amount} for ${data.businessName} failed. Please update your payment method — we'll keep retrying automatically, but your account may be paused if it keeps failing.`
      : `A platform subscription payment of ₹${amount} failed for tenant <strong>${data.businessName}</strong>. Razorpay will retry automatically; this is a heads-up on revenue at risk.`;
    await this.sendPlatformOps(to, 'platform-payment-failed', {
      businessName: data.businessName,
      amount,
      recipientNote,
    });
  }

  async sendPlatformLimitAlert(
    to: string,
    data: PlatformLimitAlertTemplateData,
  ): Promise<void> {
    const noun = data.type === 'order' ? 'order' : 'subscriber';
    const stateLabel = data.state === 'hit' ? 'Limit hit' : 'Nearing limit';
    const message =
      data.state === 'hit'
        ? `<strong>${data.businessName}</strong> has hit its plan's ${noun} limit — real customers are currently being blocked. Consider reaching out about an upgrade.`
        : `<strong>${data.businessName}</strong> is nearing its plan's ${noun} limit. Worth a heads-up before they actually hit it.`;
    await this.sendPlatformOps(to, 'platform-limit-alert', {
      businessName: data.businessName,
      stateLabel,
      message,
    });
  }

  async sendPlatformWebhookFailed(
    to: string,
    data: PlatformWebhookFailedTemplateData,
  ): Promise<void> {
    await this.sendPlatformOps(to, 'platform-webhook-failed', {
      eventType: data.eventType,
      eventId: data.eventId,
      errorMessage: data.errorMessage,
    });
  }

  async sendPlatformLeadNotification(
    to: string,
    data: PlatformLeadNotificationTemplateData,
  ): Promise<void> {
    const kindLabel = data.isUpgradeRequest
      ? 'An active tenant requested a plan upgrade'
      : 'A new lead came in from the marketing site';
    const subjectPrefix = data.isUpgradeRequest
      ? 'Upgrade request'
      : 'New lead';
    const contactLine = `${data.contactEmail}${data.contactPhone ? ` / ${data.contactPhone}` : ''}`;
    const planLine = data.planName
      ? `<p style="margin:0 0 8px;"><span style="color:#71717a;font-size:13px;">Plan interested in</span><br/>${data.planName}</p>`
      : '';
    const messageLine = data.message
      ? `<p style="margin:0;"><span style="color:#71717a;font-size:13px;">Message</span><br/>${data.message}</p>`
      : '';
    await this.sendPlatformOps(to, 'platform-lead-notification', {
      businessName: data.businessName,
      kindLabel,
      subjectPrefix,
      contactLine,
      planLine,
      messageLine,
    });
  }

  async sendPlatformCancellationRequest(
    to: string,
    data: PlatformCancellationRequestTemplateData,
  ): Promise<void> {
    await this.sendPlatformOps(to, 'platform-cancellation-request', {
      tenantName: data.tenantName,
      reason: data.reason,
    });
  }
}
