import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantNotificationTemplateRepository } from './tenant-notification-template.repository';
import { PlatformEmailTemplateService } from './platform-email-template.service';
import { renderTemplateString } from './template-renderer.util';
import { FeaturesService } from '../../modules/features/features.service';

/** The only 3 keys a tenant may ever override — order confirmation
 * (customer copy), welcome, and reset-password. OTP and the owner-copy/
 * subscription-disruption emails are never in this list, on purpose:
 * OTP is security-critical, the others are internal-facing. */
export const TENANT_EDITABLE_EMAIL_KEYS = [
  'order-confirmation-customer',
  'welcome',
  'reset-password',
] as const;

const CUSTOM_TEMPLATES_FEATURE_KEY = 'custom-notification-templates';

@Injectable()
export class TenantNotificationTemplateService {
  constructor(
    private readonly repo: TenantNotificationTemplateRepository,
    private readonly platformEmailTemplates: PlatformEmailTemplateService,
    private readonly featuresService: FeaturesService,
  ) {}

  private assertEditableKey(key: string): void {
    if (!(TENANT_EDITABLE_EMAIL_KEYS as readonly string[]).includes(key)) {
      throw new BadRequestException(
        `"${key}" isn't a tenant-customizable template`,
      );
    }
  }

  /** Effective (unrendered) subject/bodyHtml for one key — the tenant's own
   * override only counts when the feature is actually enabled for them;
   * otherwise (or with no override saved) falls back to the platform
   * default, same as every other tenant. */
  async getEffective(
    tenantId: string,
    key: string,
  ): Promise<{ subject: string; bodyHtml: string; isCustomized: boolean }> {
    this.assertEditableKey(key);
    const hasFeature = await this.featuresService.hasFeature(
      tenantId,
      CUSTOM_TEMPLATES_FEATURE_KEY,
    );
    if (hasFeature) {
      const override = await this.repo.findByTenantAndKey(tenantId, key);
      if (override) {
        return {
          subject: override.subject,
          bodyHtml: override.bodyHtml,
          isCustomized: true,
        };
      }
    }
    const fallback = await this.platformEmailTemplates.getDefault(key);
    return {
      subject: fallback?.subject ?? key,
      bodyHtml: fallback?.bodyHtml ?? '',
      isCustomized: false,
    };
  }

  async listEffectiveForTenant(tenantId: string) {
    return Promise.all(
      TENANT_EDITABLE_EMAIL_KEYS.map(async (key) => ({
        key,
        ...(await this.getEffective(tenantId, key)),
      })),
    );
  }

  async renderEmail(
    tenantId: string,
    key: string,
    data: Record<string, string>,
  ): Promise<{ subject: string; html: string }> {
    const { subject, bodyHtml } = await this.getEffective(tenantId, key);
    return {
      subject: renderTemplateString(subject, data),
      html: renderTemplateString(bodyHtml, data),
    };
  }

  async upsertOverride(
    tenantId: string,
    key: string,
    dto: { subject: string; bodyHtml: string },
    userId: string,
  ) {
    this.assertEditableKey(key);
    return this.repo.upsert(tenantId, key, {
      subject: dto.subject,
      bodyHtml: dto.bodyHtml,
      updatedByUserId: userId,
    });
  }

  async resetToDefault(tenantId: string, key: string): Promise<void> {
    this.assertEditableKey(key);
    await this.repo.delete(tenantId, key);
  }
}
