import { PUBLIC_API_URL } from "@/lib/config/env";
import { ApiError, parseOrThrow } from "@/lib/api/client";

export { ApiError };

/** Same-origin browser requests to the backend must carry the storefront's
 * own domain explicitly — see `lib/api/server-fetch.ts` for why. */
function tenantHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  return { "X-Tenant-Domain": window.location.host };
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  termsAccepted: boolean;
}

export interface RegisterResult {
  userId: string;
  verificationRequired: true;
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const res = await fetch(`${PUBLIC_API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...tenantHeaders() },
    body: JSON.stringify(input),
  });
  return parseOrThrow<RegisterResult>(res);
}

export async function resendOtp(userId: string): Promise<void> {
  const res = await fetch(`${PUBLIC_API_URL}/auth/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...tenantHeaders() },
    body: JSON.stringify({ userId }),
  });
  await parseOrThrow<void>(res);
}

export async function forgotPassword(email: string): Promise<void> {
  const res = await fetch(`${PUBLIC_API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...tenantHeaders() },
    body: JSON.stringify({ email }),
  });
  await parseOrThrow<void>(res);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const res = await fetch(`${PUBLIC_API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...tenantHeaders() },
    body: JSON.stringify({ token, newPassword }),
  });
  await parseOrThrow<void>(res);
}

/**
 * These three go through this app's own /api/auth/* route handlers (not the
 * backend directly) because they need the server to set httpOnly session
 * cookies from the returned JWTs — something client JS can't do itself.
 */
export async function verifyOtp(userId: string, code: string): Promise<void> {
  const res = await fetch(`/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, code }),
  });
  await parseOrThrow<void>(res);
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  await parseOrThrow<void>(res);
}

export async function logout(): Promise<void> {
  await fetch(`/api/auth/logout`, { method: "POST" });
}
