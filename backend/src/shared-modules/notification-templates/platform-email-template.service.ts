import { Injectable, NotFoundException } from '@nestjs/common';
import { PlatformEmailTemplateRepository } from './platform-email-template.repository';
import { renderTemplateString } from './template-renderer.util';
import {
  PLATFORM_EMAIL_TEMPLATE_DEFAULTS,
  PlatformEmailTemplateDefault,
} from '../../common/constants/notification-template-defaults';

@Injectable()
export class PlatformEmailTemplateService {
  constructor(private readonly repo: PlatformEmailTemplateRepository) {}

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
    dto: { subject: string; bodyHtml: string },
    userId: string,
  ) {
    await this.getByKeyOrThrow(key);
    return this.repo.update(key, {
      subject: dto.subject,
      bodyHtml: dto.bodyHtml,
      updatedByUserId: userId,
    });
  }

  /** Resolves + interpolates one platform-authored template. Falls back to
   * the in-code default (never throws) if the row is somehow missing —
   * defensive only, `syncDefaults()` should always have created it. */
  async render(
    key: string,
    data: Record<string, string>,
  ): Promise<{ subject: string; html: string }> {
    const row = await this.repo.findByKey(key);
    const fallback = PLATFORM_EMAIL_TEMPLATE_DEFAULTS.find(
      (d) => d.key === key,
    );
    const subject = row?.subject ?? fallback?.subject ?? key;
    const bodyHtml = row?.bodyHtml ?? fallback?.bodyHtml ?? '';
    return {
      subject: renderTemplateString(subject, data),
      html: renderTemplateString(bodyHtml, data),
    };
  }

  /** Returns the raw inner template (unrendered) for a customer-default
   * key — the fallback layer TenantNotificationTemplateService reaches for
   * when a tenant has no override of their own. */
  async getDefault(key: string): Promise<PlatformEmailTemplateDefault | null> {
    const row = await this.repo.findByKey(key);
    if (row) return { ...row, availableVars: row.availableVars };
    return PLATFORM_EMAIL_TEMPLATE_DEFAULTS.find((d) => d.key === key) ?? null;
  }

  async syncDefaults(): Promise<number> {
    for (const row of PLATFORM_EMAIL_TEMPLATE_DEFAULTS) {
      await this.repo.upsertDefault(row);
    }
    return PLATFORM_EMAIL_TEMPLATE_DEFAULTS.length;
  }
}
