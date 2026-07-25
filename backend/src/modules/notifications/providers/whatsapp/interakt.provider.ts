import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  SendWhatsAppTemplateParams,
  WhatsAppProvider,
  WhatsAppSendResult,
} from '../../interfaces/whatsapp-provider.interface';

export interface InteraktProviderConfig {
  apiKey: string;
}

const INTERAKT_API_URL = 'https://api.interakt.ai/v1/public/message/';

interface InteraktResponse {
  id?: string;
  message?: string;
}

export class InteraktProvider implements WhatsAppProvider {
  private readonly logger = new Logger(InteraktProvider.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly config: InteraktProviderConfig,
  ) {}

  async sendTemplateMessage(
    params: SendWhatsAppTemplateParams,
  ): Promise<WhatsAppSendResult> {
    const response = await firstValueFrom(
      this.httpService.post<InteraktResponse>(
        INTERAKT_API_URL,
        {
          countryCode: '+91',
          phoneNumber: params.to,
          type: 'Template',
          template: {
            name: params.templateKey,
            languageCode: 'en',
            bodyValues: Object.values(params.params),
          },
        },
        {
          headers: { Authorization: `Basic ${this.config.apiKey}` },
          timeout: 8000,
        },
      ),
    );

    const providerMessageId = response.data.id;
    if (!providerMessageId) {
      this.logger.error(
        `Interakt send failed: ${response.data.message ?? 'unknown error'}`,
      );
      throw new Error('Interakt did not return a message id');
    }

    return { providerMessageId };
  }
}
