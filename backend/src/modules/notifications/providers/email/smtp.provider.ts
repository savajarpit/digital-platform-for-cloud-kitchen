import * as nodemailer from 'nodemailer';
import {
  EmailProvider,
  EmailSendResult,
  SendEmailParams,
} from '../../interfaces/email-provider.interface';

export interface SmtpProviderConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  fromAddress: string;
  fromName: string;
}

export class SmtpProvider implements EmailProvider {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: SmtpProviderConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user
        ? { user: config.user, pass: config.password }
        : undefined,
    });
  }

  async sendMail(params: SendEmailParams): Promise<EmailSendResult> {
    const info = (await this.transporter.sendMail({
      from: `"${this.config.fromName}" <${this.config.fromAddress}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })) as { messageId: string };
    return { providerMessageId: info.messageId };
  }
}
