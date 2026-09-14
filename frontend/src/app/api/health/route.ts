import { NextResponse } from "next/server";

// Dedicated ALB health-check target — deliberately does zero data fetching.
// The real home page ("/") is a full SSR page that fans out to ~7 backend
// calls; the ALB health check hits whatever path it's pointed at every few
// seconds regardless of Host (the target's raw private IP, not a real
// tenant domain), so pointing it at "/" was quietly spamming the backend
// with "no tenant configured" errors on every single check.
export function GET() {
  return NextResponse.json({ status: "ok" });
}
