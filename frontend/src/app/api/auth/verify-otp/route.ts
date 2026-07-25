import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { API_URL } from "@/lib/config/env";
import { setSessionCookies } from "@/lib/auth/session-cookies";
import type { ApiResponse } from "@/lib/api/response";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function POST(request: Request) {
  const body = await request.text();
  const incomingHeaders = await headers();

  const backendRes = await fetch(`${API_URL}/auth/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-Domain": incomingHeaders.get("host") ?? "localhost",
    },
    body,
    cache: "no-store",
  });

  const payload = (await backendRes.json()) as ApiResponse<AuthTokens>;
  if (backendRes.ok && payload.success) {
    await setSessionCookies(payload.data);
  }

  return NextResponse.json(payload, { status: backendRes.status });
}
