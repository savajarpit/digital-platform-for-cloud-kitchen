import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export interface WhatsAppPlaceholder {
  paramKey: string;
  label: string;
}

export interface PlatformWhatsAppTemplate {
  id: string;
  key: string;
  templateKey: string;
  placeholders: WhatsAppPlaceholder[];
  updatedAt: string;
}

export function listPlatformWhatsAppTemplates(): Promise<PlatformWhatsAppTemplate[]> {
  return proxyFetch<PlatformWhatsAppTemplate[]>("/platform/whatsapp-templates");
}

export function updatePlatformWhatsAppTemplate(
  key: string,
  input: { templateKey: string; placeholders: WhatsAppPlaceholder[] },
): Promise<PlatformWhatsAppTemplate> {
  return proxyFetch<PlatformWhatsAppTemplate>(
    `/platform/whatsapp-templates/${key}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}
