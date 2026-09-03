import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export type EmailTemplateScope = "PLATFORM_OPS" | "CUSTOMER_DEFAULT";

export interface PlatformEmailTemplate {
  id: string;
  key: string;
  name: string;
  description: string;
  scope: EmailTemplateScope;
  subject: string;
  bodyHtml: string;
  availableVars: string[];
  updatedAt: string;
}

export function listPlatformEmailTemplates(): Promise<PlatformEmailTemplate[]> {
  return proxyFetch<PlatformEmailTemplate[]>("/platform/email-templates");
}

export function updatePlatformEmailTemplate(
  key: string,
  input: { subject: string; bodyHtml: string },
): Promise<PlatformEmailTemplate> {
  return proxyFetch<PlatformEmailTemplate>(`/platform/email-templates/${key}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function sendPlatformEmailTemplateTest(
  key: string,
): Promise<{ sentTo: string }> {
  return proxyFetch<{ sentTo: string }>(
    `/platform/email-templates/${key}/send-test`,
    { method: "POST" },
  );
}
