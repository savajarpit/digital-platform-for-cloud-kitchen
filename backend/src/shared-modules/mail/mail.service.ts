import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  welcomeTemplate,
  WelcomeTemplateData,
} from './templates/welcome.template';
import {
  resetPasswordTemplate,
  ResetPasswordTemplateData,
} from './templates/reset-password.template';
import {
  platformActivationInviteTemplate,
  PlatformActivationInviteTemplateData,
} from './templates/platform-activation-invite.template';
import {
  platformInvoiceTemplate,
  PlatformInvoiceTemplateData,
} from './templates/platform-invoice.template';
import {
  platformPaymentFailedTemplate,
  PlatformPaymentFailedTemplateData,
} from './templates/platform-payment-failed.template';
import {
  platformLimitAlertTemplate,
  PlatformLimitAlertTemplateData,
} from './templates/platform-limit-alert.template';
import {
  platformLeadNotificationTemplate,
  PlatformLeadNotificationTemplateData,
} from './templates/platform-lead-notification.template';
import {
  platformWebhookFailedTemplate,
  PlatformWebhookFailedTemplateData,
} from './templates/platform-webhook-failed.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly fromAddress: string;
  private readonly fromName: string;

  constructor(private readonly config: ConfigService) {
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

  async sendWelcome(to: string, data: WelcomeTemplateData): Promise<void> {
    const { subject, html } = welcomeTemplate(data);
    await this.send(to, subject, html);
  }

  async sendResetPassword(
    to: string,
    data: ResetPasswordTemplateData,
  ): Promise<void> {
    const { subject, html } = resetPasswordTemplate(data);
    await this.send(to, subject, html);
  }

  async sendPlatformActivationInvite(
    to: string,
    data: PlatformActivationInviteTemplateData,
  ): Promise<void> {
    const { subject, html } = platformActivationInviteTemplate(data);
    await this.send(to, subject, html);
  }

  async sendPlatformInvoice(
    to: string,
    data: PlatformInvoiceTemplateData,
  ): Promise<void> {
    const { subject, html } = platformInvoiceTemplate(data);
    await this.send(to, subject, html);
  }

  async sendPlatformPaymentFailed(
    to: string,
    data: PlatformPaymentFailedTemplateData,
  ): Promise<void> {
    const { subject, html } = platformPaymentFailedTemplate(data);
    await this.send(to, subject, html);
  }

  async sendPlatformLimitAlert(
    to: string,
    data: PlatformLimitAlertTemplateData,
  ): Promise<void> {
    const { subject, html } = platformLimitAlertTemplate(data);
    await this.send(to, subject, html);
  }

  async sendPlatformWebhookFailed(
    to: string,
    data: PlatformWebhookFailedTemplateData,
  ): Promise<void> {
    const { subject, html } = platformWebhookFailedTemplate(data);
    await this.send(to, subject, html);
  }

  async sendPlatformLeadNotification(
    to: string,
    data: PlatformLeadNotificationTemplateData,
  ): Promise<void> {
    const { subject, html } = platformLeadNotificationTemplate(data);
    await this.send(to, subject, html);
  }
}
