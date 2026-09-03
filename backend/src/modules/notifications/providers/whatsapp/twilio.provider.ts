import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  SendWhatsAppTemplateParams,
  WhatsAppProvider,
  WhatsAppSendResult,
} from '../../interfaces/whatsapp-provider.interface';

export interface TwilioProviderConfig {
  accountSid: string;
  authToken: string;
  /** E.164, no `whatsapp:` prefix — e.g. `+14155238886` for the shared
   * Sandbox number, or a real approved WhatsApp Business number. */
  senderNumber: string;
}

interface TwilioMessageResponse {
  sid?: string;
  message?: string;
  code?: number;
}

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

export class TwilioProvider implements WhatsAppProvider {
  private readonly logger = new Logger(TwilioProvider.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly config: TwilioProviderConfig,
  ) {}

  async sendTemplateMessage(
    params: SendWhatsAppTemplateParams,
  ): Promise<WhatsAppSendResult> {
    const body = new URLSearchParams({
      To: `whatsapp:${params.to}`,
      From: `whatsapp:${this.config.senderNumber}`,
      Body: this.renderBody(params),
    });

    const response = await firstValueFrom(
      this.httpService.post<TwilioMessageResponse>(
        `${TWILIO_API_BASE}/Accounts/${this.config.accountSid}/Messages.json`,
        body.toString(),
        {
          auth: {
            username: this.config.accountSid,
            password: this.config.authToken,
          },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 8000,
        },
      ),
    );

    const providerMessageId = response.data.sid;
    if (!providerMessageId) {
      this.logger.error(
        `Twilio send failed: ${response.data.message ?? 'unknown error'}`,
      );
      throw new Error('Twilio did not return a message sid');
    }

    return { providerMessageId };
  }

  /**
   * Twilio's Sandbox accepts plain free-text (`Body`) with no Meta approval
   * needed — that's the whole point of the sandbox. Production WhatsApp
   * Business on Twilio instead requires an approved Content Template
   * (`ContentSid` + `ContentVariables`, a separate Twilio-specific setup
   * this doesn't implement yet). This composes a readable message straight
   * from the same params every other provider already receives, so sandbox
   * testing works end-to-end without any extra approval step.
   */
  private renderBody(params: SendWhatsAppTemplateParams): string {
    const lines = Object.entries(params.params).map(
      ([key, value]) => `${key}: ${value}`,
    );
    return `[${params.templateKey}]\n${lines.join('\n')}`;
  }
}
