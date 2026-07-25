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

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.name} failed after ${job.attemptsMade} attempts`,
      error.stack,
    );
  }
}
