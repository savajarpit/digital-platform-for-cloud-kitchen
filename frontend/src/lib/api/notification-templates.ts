import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export interface TenantEmailTemplate {
  key: string;
  subject: string;
  bodyHtml: string;
  isCustomized: boolean;
  availableVars: string[];
}

export interface WhatsAppTemplatePreview {
  key: string;
  templateKey: string;
  placeholders: { paramKey: string; label: string; sampleValue: string }[];
}

export function getTenantEmailTemplates(): Promise<TenantEmailTemplate[]> {
  return proxyFetch<TenantEmailTemplate[]>("/notification-templates/email/me");
}

export function updateTenantEmailTemplate(
  key: string,
  input: { subject: string; bodyHtml: string },
): Promise<unknown> {
  return proxyFetch(`/notification-templates/email/${key}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function resetTenantEmailTemplate(key: string): Promise<unknown> {
  return proxyFetch(`/notification-templates/email/${key}`, {
    method: "DELETE",
  });
}

export function getWhatsAppTemplatePreviews(): Promise<WhatsAppTemplatePreview[]> {
  return proxyFetch<WhatsAppTemplatePreview[]>("/notification-templates/whatsapp");
}
