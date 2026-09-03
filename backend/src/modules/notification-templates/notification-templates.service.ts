import { Injectable } from '@nestjs/common';
import { TenantNotificationTemplateService } from '../../shared-modules/notification-templates/tenant-notification-template.service';
import { PlatformWhatsAppTemplateService } from '../../shared-modules/notification-templates/platform-whatsapp-template.service';
import { PlatformEmailTemplateService } from '../../shared-modules/notification-templates/platform-email-template.service';

/** Sample values for WhatsApp placeholder previews, keyed by the
 * snake_case paramKey convention the real templates use (distinct from the
 * email tokens' camelCase — see notification-template-defaults.ts). */
const WHATSAPP_SAMPLE_VALUES: Record<string, string> = {
  name: 'Priya Sharma',
  customer_name: 'Priya Sharma',
  order_number: 'ORD-10234',
  total: '₹458.00',
  slot: 'Lunch (12:00 PM-1:00 PM)',
  date: 'Today, 3 Sep',
  plan_name: '7-Day Weight Loss Plan',
  reason: 'a kitchen closure on that date',
  compensation_days: '1',
  otp: '482913',
};

@Injectable()
export class NotificationTemplatesService {
  constructor(
    private readonly tenantEmailTemplates: TenantNotificationTemplateService,
    private readonly whatsAppTemplates: PlatformWhatsAppTemplateService,
    private readonly platformEmailTemplates: PlatformEmailTemplateService,
  ) {}

  async listEmailTemplates(tenantId: string) {
    const rows =
      await this.tenantEmailTemplates.listEffectiveForTenant(tenantId);
    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        availableVars:
          (await this.platformEmailTemplates.getDefault(row.key))
            ?.availableVars ?? [],
      })),
    );
  }

  upsertEmailOverride(
    tenantId: string,
    key: string,
    dto: { subject: string; bodyHtml: string },
    userId: string,
  ) {
    return this.tenantEmailTemplates.upsertOverride(tenantId, key, dto, userId);
  }

  resetEmailOverride(tenantId: string, key: string) {
    return this.tenantEmailTemplates.resetToDefault(tenantId, key);
  }

  /** Honest preview for WhatsApp: since the real message wording lives in
   * a Meta-approved template outside this app, this shows exactly which
   * approved template will fire and which data fills each of its
   * placeholders — not a reconstructed sentence, which we have no way to
   * know is accurate. */
  async listWhatsAppPreviews() {
    const rows = await this.whatsAppTemplates.listAll();
    return rows.map((row) => ({
      key: row.key,
      templateKey: row.templateKey,
      placeholders: (
        row.placeholders as { paramKey: string; label: string }[]
      ).map((p) => ({
        ...p,
        sampleValue: WHATSAPP_SAMPLE_VALUES[p.paramKey] ?? '—',
      })),
    }));
  }
}
