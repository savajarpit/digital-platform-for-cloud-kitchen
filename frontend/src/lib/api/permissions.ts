import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export interface MyPermissions {
  role: string;
  isSuperAdmin: boolean;
  permissions: string[];
}

export function getMyPermissions(): Promise<MyPermissions> {
  return proxyFetch<MyPermissions>("/permissions/me");
}
