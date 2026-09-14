import { NextRequest, NextResponse } from "next/server";

// Must match REFRESH_TOKEN_COOKIE in lib/auth/session-cookies.ts — not
// imported directly since that file also imports next/headers, which isn't
// usable in the proxy (Edge) runtime.
const REFRESH_TOKEN_COOKIE = "refresh_token";

// UI convenience only, not a security boundary (same reasoning as the
// admin-dropdown's unverified JWT decode) — an already-logged-in visitor
// shouldn't land back on a login form just because they typed /login, but
// the real access control stays server-side (getSession()/guards). The
// matcher below already scopes this to only the auth pages.
export function proxy(request: NextRequest) {
  if (request.cookies.has(REFRESH_TOKEN_COOKIE)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/signup", "/forgot-password", "/reset-password"],
};
