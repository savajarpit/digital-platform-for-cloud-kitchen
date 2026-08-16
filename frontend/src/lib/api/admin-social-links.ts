import { ApiError, proxyFetch } from "@/lib/api/client";
import type { SocialPlatform } from "@/lib/api/social-links";

export { ApiError };
export type { SocialPlatform };

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
  isEnabled: boolean;
  sortOrder: number;
}

export interface CreateSocialLinkInput {
  platform: SocialPlatform;
  url: string;
  isEnabled?: boolean;
}

export interface UpdateSocialLinkInput {
  url?: string;
  isEnabled?: boolean;
}

export function listSocialLinksAdmin(): Promise<SocialLink[]> {
  return proxyFetch<SocialLink[]>("/social-links/admin");
}

export function createSocialLink(input: CreateSocialLinkInput): Promise<SocialLink> {
  return proxyFetch<SocialLink>("/social-links", { method: "POST", body: JSON.stringify(input) });
}

export function updateSocialLink(id: string, input: UpdateSocialLinkInput): Promise<SocialLink> {
  return proxyFetch<SocialLink>(`/social-links/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteSocialLink(id: string): Promise<void> {
  return proxyFetch<void>(`/social-links/${id}`, { method: "DELETE" });
}
