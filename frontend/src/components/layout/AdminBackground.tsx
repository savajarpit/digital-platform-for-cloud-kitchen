"use client";

import { usePathname } from "next/navigation";

/**
 * Fills the page behind Header/content/Footer with the admin shell's
 * background color. Needed because Footer's mt-20 margin exposes the
 * body background in the gap above it, and AdminShell's own bg only
 * covers its content box, not that gap — without this the gap shows
 * through as a white bar on admin pages.
 */
export function AdminBackground() {
  const pathname = usePathname();
  if (!pathname.startsWith("/admin")) return null;

  return (
    <div
      className="fixed inset-0 -z-10 bg-zinc-50 dark:bg-zinc-950"
      aria-hidden="true"
    />
  );
}
