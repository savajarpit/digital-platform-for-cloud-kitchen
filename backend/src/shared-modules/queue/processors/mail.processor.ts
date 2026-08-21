import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MailService } from '../../mail/mail.service';

export interface WelcomeEmailJob {
  email: string;
  firstName: string;
}

export interface ResetPasswordEmailJob {
  email: string;
  resetUrl: string;
}

export interface PlatformActivationInviteEmailJob {
  email: string;
  businessName: string;
  activationUrl: string;
  planCode: string;
  amountInPaise: number;
  billingCycle: 'MONTHLY' | 'YEARLY';
}

export interface PlatformInvoiceEmailJob {
  email: string;
  businessName: string;
  amountInPaise: number;
  invoiceUrl: string | null;
}

export interface PlatformPaymentFailedEmailJob {
  email: string;
  businessName: string;
  amountInPaise: number;
  isOwnerRecipient: boolean;
}

export interface PlatformLimitAlertEmailJob {
  email: string;
  businessName: string;
  type: 'order' | 'subscriber';
  state: 'near' | 'hit';
}

export interface PlatformLeadNotificationEmailJob {
  email: string;
  businessName: string;
  contactEmail: string;
  contactPhone: string | null;
  planName: string | null;
  message: string | null;
  isUpgradeRequest: boolean;
}

export interface PlatformWebhookFailedEmailJob {
  email: string;
  eventType: string;
  eventId: string;
  errorMessage: string;
}

@Processor('mail')
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {}

  @Process('send-welcome')
  async sendWelcome(job: Job<WelcomeEmailJob>) {
    await this.mailService.sendWelcome(job.data.email, {
      firstName: job.data.firstName,
    });
  }

  @Process('send-reset-password')
  async sendResetPassword(job: Job<ResetPasswordEmailJob>) {
    await this.mailService.sendResetPassword(job.data.email, {
      resetUrl: job.data.resetUrl,
    });
  }

  @Process('send-platform-activation-invite')
  async sendPlatformActivationInvite(
    job: Job<PlatformActivationInviteEmailJob>,
  ) {
    await this.mailService.sendPlatformActivationInvite(job.data.email, {
      businessName: job.data.businessName,
      activationUrl: job.data.activationUrl,
      planCode: job.data.planCode,
      amountInPaise: job.data.amountInPaise,
      billingCycle: job.data.billingCycle,
    });
  }

  @Process('send-platform-invoice')
  async sendPlatformInvoice(job: Job<PlatformInvoiceEmailJob>) {
    await this.mailService.sendPlatformInvoice(job.data.email, {
      businessName: job.data.businessName,
      amountInPaise: job.data.amountInPaise,
      invoiceUrl: job.data.invoiceUrl,
    });
  }

  @Process('send-platform-payment-failed')
  async sendPlatformPaymentFailed(job: Job<PlatformPaymentFailedEmailJob>) {
    await this.mailService.sendPlatformPaymentFailed(job.data.email, {
      businessName: job.data.businessName,
      amountInPaise: job.data.amountInPaise,
      isOwnerRecipient: job.data.isOwnerRecipient,
    });
  }

  @Process('send-platform-limit-alert')
  async sendPlatformLimitAlert(job: Job<PlatformLimitAlertEmailJob>) {
    await this.mailService.sendPlatformLimitAlert(job.data.email, {
      businessName: job.data.businessName,
      type: job.data.type,
      state: job.data.state,
    });
  }

  @Process('send-platform-webhook-failed')
  async sendPlatformWebhookFailed(job: Job<PlatformWebhookFailedEmailJob>) {
    await this.mailService.sendPlatformWebhookFailed(job.data.email, {
      eventType: job.data.eventType,
      eventId: job.data.eventId,
      errorMessage: job.data.errorMessage,
    });
  }

  @Process('send-platform-lead-notification')
  async sendPlatformLeadNotification(
    job: Job<PlatformLeadNotificationEmailJob>,
  ) {
    await this.mailService.sendPlatformLeadNotification(job.data.email, {
      businessName: job.data.businessName,
      contactEmail: job.data.contactEmail,
      contactPhone: job.data.contactPhone,
      planName: job.data.planName,
      message: job.data.message,
      isUpgradeRequest: job.data.isUpgradeRequest,
    });
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.name} failed after ${job.attemptsMade} attempts`,
      error.stack,
    );
  }
}
