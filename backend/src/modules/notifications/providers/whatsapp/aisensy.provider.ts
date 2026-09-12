import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse, isAxiosError } from 'axios';
import {
  SendWhatsAppTemplateParams,
  WhatsAppProvider,
  WhatsAppSendResult,
} from '../../interfaces/whatsapp-provider.interface';

export interface AiSensyProviderConfig {
  apiKey: string;
  /** Maps our resolved template key (`order_confirmation_customer`, etc.)
   * to the exact AiSensy Campaign name (Manage → Campaigns) wrapping that
   * Meta-approved template. AiSensy's API sends by campaign name, not a
   * template id — unlike Twilio there's no shared sandbox template either,
   * so every key here needs its own approved campaign on the tenant's own
   * WhatsApp Business number before it can be used. */
  campaignNames: Record<string, string>;
}

interface AiSensyResponse {
  // AiSensy's documented response is just "status 200 on success" with no
  // stable field name for a message id across their docs/support threads —
  // check the couple of shapes that show up in practice, but don't assume.
  id?: string;
  submitted_message_id?: string;
  data?: { id?: string };
  success?: boolean;
  message?: string;
  error?: string;
}

const AISENSY_API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2';

export class AiSensyProvider implements WhatsAppProvider {
  private readonly logger = new Logger(AiSensyProvider.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly config: AiSensyProviderConfig,
  ) {}

  async sendTemplateMessage(
    params: SendWhatsAppTemplateParams,
  ): Promise<WhatsAppSendResult> {
    const campaignName = this.config.campaignNames[params.templateKey];
    if (!campaignName) {
      throw new Error(
        `No AiSensy campaign configured for template "${params.templateKey}" — create an approved campaign for it (Manage → Campaigns) and add its exact name to whatsappConfig.campaignNames.`,
      );
    }

    // AiSensy requires a userName field independent of templateParams; the
    // first param our template builders emit is always the recipient's
    // name (see templates/whatsapp/*.template.ts), so reuse it here rather
    // than asking every caller to pass it twice.
    const userName = Object.values(params.params)[0] ?? 'Customer';

    let response: AxiosResponse<AiSensyResponse>;
    try {
      response = await firstValueFrom(
        this.httpService.post<AiSensyResponse>(
          AISENSY_API_URL,
          {
            apiKey: this.config.apiKey,
            campaignName,
            destination: params.to,
            userName,
            templateParams: Object.values(params.params),
          },
          { timeout: 8000 },
        ),
      );
    } catch (error) {
      if (isAxiosError<AiSensyResponse>(error) && error.response) {
        const { status, data } = error.response;
        const detail = data?.message ?? data?.error ?? 'request failed';
        this.logger.error(`AiSensy send failed (HTTP ${status}): ${detail}`);
        throw new Error(`AiSensy ${status}: ${detail}`);
      }
      throw error;
    }

    if (response.data.success === false || response.data.error) {
      const detail =
        response.data.error ?? response.data.message ?? 'unknown error';
      this.logger.error(`AiSensy send failed: ${detail}`);
      throw new Error(`AiSensy: ${detail}`);
    }

    const providerMessageId =
      response.data.id ??
      response.data.submitted_message_id ??
      response.data.data?.id ??
      // AiSensy's v2 campaign endpoint doesn't reliably echo an id — a
      // synthetic one still lets NotificationLog record "this one went
      // out", which is what every caller actually checks for.
      `aisensy-${Date.now()}`;

    return { providerMessageId };
  }
}
