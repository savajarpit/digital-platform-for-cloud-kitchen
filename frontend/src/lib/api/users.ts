import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  role: string;
}

export interface ProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export function getMyProfile(): Promise<Profile> {
  return proxyFetch<Profile>("/users/me");
}

export function updateMyProfile(input: ProfileInput): Promise<Profile> {
  return proxyFetch<Profile>("/users/me", { method: "PATCH", body: JSON.stringify(input) });
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function changeMyPassword(input: ChangePasswordInput): Promise<void> {
  return proxyFetch<void>("/users/me/password", { method: "PATCH", body: JSON.stringify(input) });
}
