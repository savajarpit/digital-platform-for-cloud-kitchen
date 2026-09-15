import { NextRequest, NextResponse } from "next/server";

// Must match ACCESS_TOKEN_COOKIE in lib/auth/session-cookies.ts — not
// imported directly since that file also imports next/headers, which isn't
// usable in the proxy (Edge) runtime. Deliberately the access token, not the
// refresh token: get-session.ts (what the rest of the app treats as "logged
// in") only ever checks the access token too, and never uses the refresh
// token to silently re-establish a session. Checking the refresh token here
// instead would disagree with that — the UI already shows logged-out once
// the 15-minute access token expires, while the 7-day refresh token cookie
// lingers long after, which would wrongly bounce a visitor away from /login
// during that whole window even though every other page already treats them
// as logged out.
const ACCESS_TOKEN_COOKIE = "access_token";

// UI convenience only, not a security boundary (same reasoning as the
// admin-dropdown's unverified JWT decode) — an already-logged-in visitor
// shouldn't land back on a login form just because they typed /login, but
// the real access control stays server-side (getSession()/guards). The
// matcher below already scopes this to only the auth pages.
export function proxy(request: NextRequest) {
  if (request.cookies.has(ACCESS_TOKEN_COOKIE)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/signup", "/forgot-password", "/reset-password"],
};
