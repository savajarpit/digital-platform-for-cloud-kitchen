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
}
