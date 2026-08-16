import { serverFetch } from "@/lib/api/server-fetch";
import type { ApiResponse } from "@/lib/api/response";

export type SocialPlatform =
  | "INSTAGRAM"
  | "FACEBOOK"
  | "YOUTUBE"
  | "LINKEDIN"
  | "TWITTER"
  | "WHATSAPP"
  | "PINTEREST";

export interface PublicSocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
}

/** Server-side only — enabled social links for the footer. */
export async function getPublicSocialLinks(): Promise<PublicSocialLink[]> {
  try {
    const res = await serverFetch("/social-links");
    if (!res.ok) return [];
    const body = (await res.json()) as ApiResponse<PublicSocialLink[]>;
    return body.data ?? [];
  } catch {
    return [];
  }
}
