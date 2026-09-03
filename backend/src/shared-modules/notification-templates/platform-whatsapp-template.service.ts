import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PlatformWhatsAppTemplateRepository } from './platform-whatsapp-template.repository';
import { PLATFORM_WHATSAPP_TEMPLATE_DEFAULTS } from '../../common/constants/notification-template-defaults';

export interface WhatsAppPlaceholder {
  paramKey: string;
  label: string;
}

@Injectable()
export class PlatformWhatsAppTemplateService {
  constructor(private readonly repo: PlatformWhatsAppTemplateRepository) {}

  listAll() {
    return this.repo.findAll();
  }

  async getByKeyOrThrow(key: string) {
    const row = await this.repo.findByKey(key);
    if (!row) throw new NotFoundException('Unknown template key');
    return row;
  }

  async update(
    key: string,
    dto: { templateKey: string; placeholders: WhatsAppPlaceholder[] },
  ) {
    await this.getByKeyOrThrow(key);
    return this.repo.update(key, {
      templateKey: dto.templateKey,
      placeholders: dto.placeholders as unknown as Prisma.InputJsonValue,
    });
  }

  /** The real approved template name to send — only ever swaps
   * `templateKey`, never the params a caller already computed (their order
   * must match the real approved template's slot order, which isn't safe
   * to re-derive from the display-only `placeholders` metadata). Falls
   * back to the in-code default (never throws) if the row is missing. */
  async resolveTemplateKey(
    key: string,
    hardcodedFallback: string,
  ): Promise<string> {
    const row = await this.repo.findByKey(key);
    if (row) return row.templateKey;
    const fallback = PLATFORM_WHATSAPP_TEMPLATE_DEFAULTS.find(
      (d) => d.key === key,
    );
    return fallback?.templateKey ?? hardcodedFallback;
  }

  async syncDefaults(): Promise<number> {
    for (const row of PLATFORM_WHATSAPP_TEMPLATE_DEFAULTS) {
      await this.repo.upsertDefault({
        key: row.key,
        templateKey: row.templateKey,
        placeholders: row.placeholders as unknown as Prisma.InputJsonValue,
      });
    }
    return PLATFORM_WHATSAPP_TEMPLATE_DEFAULTS.length;
  }
}
