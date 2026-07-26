import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { API_URL } from "@/lib/config/env";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearSessionCookies,
  setSessionCookies,
} from "@/lib/auth/session-cookies";
import type { ApiResponse } from "@/lib/api/response";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generic authenticated backend proxy for Client Components. The access
 * token lives in an httpOnly cookie (by design — no client JS access), so
 * any authenticated fetch from a Client Component has to go through a
 * server-side hop that can read it and attach `Authorization: Bearer`.
 * Also handles silent refresh-on-401 so a 15-minute access token expiring
 * mid-session doesn't bounce the user to login.
 */
async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  const cookieStore = await cookies();
  const incomingHeaders = await headers();
  const tenantDomain = incomingHeaders.get("host") ?? "localhost";
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  const targetUrl = `${API_URL}/${path.join("/")}${req.nextUrl.search}`;
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();

  const doFetch = (token?: string) =>
    fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Domain": tenantDomain,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
      cache: "no-store",
    });

  let res = await doFetch(accessToken);

  if (res.status === 401) {
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
    if (refreshToken) {
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "X-Tenant-Domain": tenantDomain,
          Authorization: `Bearer ${refreshToken}`,
        },
        cache: "no-store",
      });

      if (refreshRes.ok) {
        const refreshBody = (await refreshRes.json()) as ApiResponse<AuthTokens>;
        await setSessionCookies(refreshBody.data);
        res = await doFetch(refreshBody.data.accessToken);
      } else {
        await clearSessionCookies();
      }
    }
  }

  const responseText = await res.text();
  return new NextResponse(responseText, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  return proxy(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  return proxy(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return proxy(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return proxy(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return proxy(req, (await ctx.params).path);
}
