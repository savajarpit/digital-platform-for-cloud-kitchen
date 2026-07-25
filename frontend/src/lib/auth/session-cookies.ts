import { cookies } from "next/headers";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes — matches backend JWT_ACCESS_EXPIRY
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days — matches backend JWT_REFRESH_EXPIRY

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Stores the JWT pair as httpOnly cookies. Only callable from a Route Handler. */
export async function setSessionCookies(tokens: AuthTokens): Promise<void> {
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";

  cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}
