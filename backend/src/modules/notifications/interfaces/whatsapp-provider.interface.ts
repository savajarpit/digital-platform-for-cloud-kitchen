export interface SendWhatsAppTemplateParams {
  to: string;
  templateKey: string;
  params: Record<string, string>;
}

export interface WhatsAppSendResult {
  providerMessageId: string;
}

/**
 * Every WhatsApp BSP (Interakt, AiSensy, Gupshup, Twilio, ...) implements
 * this. Callers (NotificationsService) only ever depend on this interface —
 * swapping a tenant's provider is a NotificationSettings config change, not
 * a code change anywhere else.
 */
export interface WhatsAppProvider {
  sendTemplateMessage(
    params: SendWhatsAppTemplateParams,
  ): Promise<WhatsAppSendResult>;
}
