import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse, isAxiosError } from 'axios';
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
  /**
   * Maps our resolved template key (`order_confirmation_customer`,
   * `order_confirmation_owner`, `signup_otp`, `subscription_disruption`) to
   * a Twilio Content Template SID (`HX…`). When an entry exists for the
   * message being sent, we send `ContentSid` + `ContentVariables` — which
   * is what a real WhatsApp Business sender (and, increasingly, the
   * Sandbox) requires for business-initiated messages. With no entry we
   * fall back to a plain `Body`, which still works on the shared Sandbox
   * and inside an open 24-hour session window.
   *
   * The template's positional variables must match the order our template
   * builders emit their params in — `{{1}}` = first param, `{{2}}` = second,
   * and so on (see templates/whatsapp/*.template.ts):
   *   order_confirmation_customer: name, order_number, total, slot, date
   *   order_confirmation_owner:    customer_name, order_number, total, slot, date
   *   signup_otp:                  name, otp
   *   subscription_disruption:     name, plan, date, reason, compensation
   */
  contentSids?: Record<string, string>;
}

interface TwilioMessageResponse {
  sid?: string;
  message?: string;
  code?: number;
  more_info?: string;
  status?: number;
}

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';
// Twilio Account SIDs are always "AC" + 32 hex chars; Content SIDs "HX" +
// 32 hex. A value that doesn't match can only ever produce an opaque 4xx,
// which is miserable to debug — reject it up front instead.
const ACCOUNT_SID_RE = /^AC[0-9a-fA-F]{32}$/;
const CONTENT_SID_RE = /^HX[0-9a-fA-F]{32}$/;

export class TwilioProvider implements WhatsAppProvider {
  private readonly logger = new Logger(TwilioProvider.name);
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly senderNumber: string;
  private readonly contentSids: Record<string, string>;

  constructor(
    private readonly httpService: HttpService,
    config: TwilioProviderConfig,
  ) {
    // A secret pasted from a console often carries a stray space/newline;
    // the settings DTO trims on save, but rows saved before that landed are
    // still dirty — trim here too so existing configs aren't stuck failing.
    this.accountSid = config.accountSid?.trim() ?? '';
    this.authToken = config.authToken?.trim() ?? '';
    this.senderNumber = config.senderNumber?.trim() ?? '';
    this.contentSids = Object.fromEntries(
      Object.entries(config.contentSids ?? {}).map(([k, v]) => [
        k,
        String(v).trim(),
      ]),
    );
  }

  async sendTemplateMessage(
    params: SendWhatsAppTemplateParams,
  ): Promise<WhatsAppSendResult> {
    if (!ACCOUNT_SID_RE.test(this.accountSid)) {
      throw new Error(
        'Twilio Account SID is malformed — it must be "AC" followed by 32 hex characters (copy it from the Twilio Console dashboard, not an API Key "SK..." value).',
      );
    }
    if (!this.authToken) {
      throw new Error('Twilio Auth Token is missing.');
    }
    if (!this.senderNumber.startsWith('+')) {
      throw new Error(
        `Twilio sender number "${this.senderNumber}" must be in E.164 form (e.g. +14155238886 for the Sandbox).`,
      );
    }

    const body = new URLSearchParams({
      To: `whatsapp:${params.to}`,
      From: `whatsapp:${this.senderNumber}`,
    });

    const contentSid = this.contentSids[params.templateKey];
    if (contentSid) {
      if (!CONTENT_SID_RE.test(contentSid)) {
        throw new Error(
          `Configured Content SID for "${params.templateKey}" is malformed — it must be "HX" followed by 32 hex characters.`,
        );
      }
      body.set('ContentSid', contentSid);
      // Twilio wants a JSON object keyed by 1-based position. Our template
      // builders already emit params in the intended {{1}}, {{2}}, … order.
      const values = Object.values(params.params);
      body.set(
        'ContentVariables',
        JSON.stringify(
          Object.fromEntries(values.map((v, i) => [String(i + 1), v])),
        ),
      );
    } else {
      body.set('Body', this.renderBody(params));
    }

    let response: AxiosResponse<TwilioMessageResponse>;
    try {
      response = await firstValueFrom(
        this.httpService.post<TwilioMessageResponse>(
          `${TWILIO_API_BASE}/Accounts/${this.accountSid}/Messages.json`,
          body.toString(),
          {
            auth: {
              username: this.accountSid,
              password: this.authToken,
            },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 8000,
          },
        ),
      );
    } catch (error) {
      // Axios's own error.message is just "Request failed with status code
      // 401" — useless. Twilio's response body carries a numeric `code`
      // (e.g. 20003 = authenticate, 21654 = ContentSid required), a human
      // `message`, and a `more_info` docs URL. Surface all of it.
      if (isAxiosError<TwilioMessageResponse>(error) && error.response) {
        const { status, data } = error.response;
        const detail = [
          data?.message ?? 'request failed',
          data?.code != null ? `code ${data.code}` : null,
          data?.more_info ?? null,
        ]
          .filter(Boolean)
          .join(' — ');
        this.logger.error(`Twilio send failed (HTTP ${status}): ${detail}`);
        if (status === 401) {
          throw new Error(
            `Twilio ${status}: authentication rejected (${detail}). The stored Account SID + Auth Token pair is invalid — re-copy both from the Twilio Console (same project, live credentials) and save again.`,
          );
        }
        if (data?.code === 21654 || data?.code === 63016) {
          throw new Error(
            `Twilio ${status}: this WhatsApp sender requires an approved Content Template for "${params.templateKey}" (${detail}). Add its HX Content SID to the tenant's whatsappConfig.contentSids.`,
          );
        }
        throw new Error(`Twilio ${status}: ${detail}`);
      }
      throw error;
    }

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
   * Free-text fallback for the shared Sandbox / an open 24-hour session
   * window, used only when no Content SID is configured for this template.
   * Composes a readable message from the same params every other provider
   * receives, so basic Sandbox testing works with zero extra setup.
   */
  private renderBody(params: SendWhatsAppTemplateParams): string {
    const lines = Object.entries(params.params).map(
      ([key, value]) => `${key}: ${value}`,
    );
    return `[${params.templateKey}]\n${lines.join('\n')}`;
  }
}
