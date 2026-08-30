"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, Menu, ShieldCheck, X } from "lucide-react";
import { PermissionsProvider, usePermissions } from "@/context/PermissionsContext";
import { FeaturesProvider } from "@/context/FeaturesContext";
import { AdminSidebar } from "./AdminSidebar";
import { UsageLimitBanner } from "./UsageLimitBanner";

function RoleBadge() {
  const { role, isSuperAdmin, loading } = usePermissions();
  if (loading) return null;
  return (
    <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
      <ShieldCheck className="h-3 w-3" />
      {isSuperAdmin ? "Super Admin" : role}
    </span>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Closes the mobile/tablet drawer on every navigation — a link click
  // inside it, back/forward, anything — without needing an onClick on each
  // of AdminSidebar's 15+ individual nav links (two data-driven lists plus
  // a hardcoded SUPER_ADMIN block). Adjusted during render (React's
  // documented pattern for "reset state when a prop changes") rather than
  // in a useEffect, which would set state synchronously after paint and
  // cause an extra cascading render for a purely visual close.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setSidebarOpen(false);
  }

  return (
    <PermissionsProvider>
      <FeaturesProvider>
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 print:bg-white">
          <header className="border-b border-zinc-200 bg-white print:hidden dark:border-zinc-800 dark:bg-zinc-900">
            <div className="container-app flex h-16 items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="cursor-pointer text-zinc-500 hover:text-primary-600 lg:hidden dark:text-zinc-400"
                  aria-label="Open menu"
                  aria-expanded={sidebarOpen}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <Link
                  href="/"
                  className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-primary-600 dark:text-zinc-400"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back to storefront</span>
                </Link>
              </div>
              <h1 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Admin Settings
              </h1>
              <RoleBadge />
            </div>
          </header>

          {/* Mobile/tablet nav drawer (<lg:) — no Modal/Dialog primitive
           * exists in this codebase, so this is a plain fixed-position
           * backdrop + panel, matching the customer-facing Header's
           * "no portal, no animation" mobile-nav precedent. z-[3000] is
           * deliberately far above every other in-app z-index (e.g. the
           * location-picker map's z-[2000] dropdown) so the drawer always
           * wins regardless of what's open on the page underneath it. */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-[3000] lg:hidden">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-white p-4 shadow-xl dark:bg-zinc-900">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Menu
                  </span>
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="cursor-pointer text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <AdminSidebar />
              </div>
            </div>
          )}

          <div className="container-app flex flex-col gap-6 py-8 lg:flex-row print:block print:gap-0 print:p-0">
            <div className="hidden lg:block lg:w-56 lg:shrink-0 print:hidden">
              <AdminSidebar />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-6 print:block">
              <div className="print:hidden">
                <UsageLimitBanner />
              </div>
              {children}
            </div>
          </div>
        </div>
      </FeaturesProvider>
    </PermissionsProvider>
  );
}
