import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export interface HomePageContent {
  id: string;
  heroTagline: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrls: string[];
  reviewsSectionTitle: string | null;
  reviewsSectionDescription: string | null;
  ctaEnabled: boolean;
  ctaTitle: string | null;
  ctaDescription: string | null;
  ctaPrimaryLabel: string | null;
  ctaPrimaryLink: string | null;
  ctaSecondaryLabel: string | null;
  ctaSecondaryLink: string | null;
}

export type UpdateHomePageContentInput = Partial<
  Omit<HomePageContent, "id">
>;

export function getHomePageContent(): Promise<HomePageContent | null> {
  return proxyFetch<HomePageContent | null>("/settings/home-page-content");
}

export function updateHomePageContent(
  input: UpdateHomePageContentInput,
): Promise<HomePageContent> {
  return proxyFetch<HomePageContent>("/settings/home-page-content", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
