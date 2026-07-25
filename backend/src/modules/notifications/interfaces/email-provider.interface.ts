export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export interface EmailSendResult {
  providerMessageId?: string;
}

/** Tenant-branded email delivery — distinct from the platform's own MailService. */
export interface EmailProvider {
  sendMail(params: SendEmailParams): Promise<EmailSendResult>;
}
