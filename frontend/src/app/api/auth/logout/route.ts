import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth/session-cookies";

export async function POST() {
  await clearSessionCookies();
  return NextResponse.json({ success: true });
}
