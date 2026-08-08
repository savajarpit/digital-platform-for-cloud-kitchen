"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { PermissionsProvider, usePermissions } from "@/context/PermissionsContext";
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
  return (
    <PermissionsProvider>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="container-app flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-primary-600 dark:text-zinc-400"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to storefront
              </Link>
            </div>
            <h1 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Admin Settings
            </h1>
            <RoleBadge />
          </div>
        </header>

        <div className="container-app flex flex-col gap-6 py-8 sm:flex-row">
          <AdminSidebar />
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <UsageLimitBanner />
            {children}
          </div>
        </div>
      </div>
    </PermissionsProvider>
  );
}
