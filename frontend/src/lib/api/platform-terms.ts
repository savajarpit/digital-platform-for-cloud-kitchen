import { proxyFetch, ApiError } from "@/lib/api/client";

export { ApiError };

export interface PlatformTerms {
  id: string;
  version: number;
  content: string;
  publishedAt: string;
}

export interface MyPlatformTermsStatus {
  hasTerms: boolean;
  latestVersion: number | null;
  content: string | null;
  accepted: boolean;
}

export function getLatestPlatformTerms(): Promise<PlatformTerms | null> {
  return proxyFetch<PlatformTerms | null>("/platform-terms/latest");
}

export function getMyPlatformTermsStatus(): Promise<MyPlatformTermsStatus> {
  return proxyFetch<MyPlatformTermsStatus>("/platform-terms/me");
}

export function acceptPlatformTerms(): Promise<void> {
  return proxyFetch<void>("/platform-terms/accept", { method: "POST" });
}

export function listPlatformTermsHistory(): Promise<PlatformTerms[]> {
  return proxyFetch<PlatformTerms[]>("/platform-terms");
}

export function publishPlatformTerms(content: string): Promise<PlatformTerms> {
  return proxyFetch<PlatformTerms>("/platform-terms", {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
