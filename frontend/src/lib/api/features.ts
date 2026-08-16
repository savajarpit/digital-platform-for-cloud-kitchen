import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export interface MyFeatures {
  features: string[];
}

export function getMyFeatures(): Promise<MyFeatures> {
  return proxyFetch<MyFeatures>("/features/me");
}
