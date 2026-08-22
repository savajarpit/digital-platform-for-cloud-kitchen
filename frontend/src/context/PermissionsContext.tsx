"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getMyPermissions, type MyPermissions } from "@/lib/api/permissions";

interface PermissionsContextValue extends MyPermissions {
  loading: boolean;
  can: (permissionKey: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MyPermissions | null>(null);
  const pathname = usePathname();

  // This provider mounts once for the whole admin session (see AdminShell),
  // so a SUPER_ADMIN revoking a grant while a tenant is already browsing
  // wouldn't otherwise be reflected until a hard reload. Re-checking on
  // every admin-side navigation, plus on tab focus (catches a grant change
  // made while this tab was backgrounded), keeps it current without
  // needing a live push channel.
  useEffect(() => {
    getMyPermissions()
      .then(setState)
      .catch(() => setState({ role: "", isSuperAdmin: false, permissions: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    function refetch() {
      getMyPermissions()
        .then(setState)
        .catch(() => undefined);
    }
    window.addEventListener("focus", refetch);
    return () => window.removeEventListener("focus", refetch);
  }, []);

  const value: PermissionsContextValue = {
    role: state?.role ?? "",
    isSuperAdmin: state?.isSuperAdmin ?? false,
    permissions: state?.permissions ?? [],
    loading: state === null,
    can: (permissionKey: string) =>
      (state?.isSuperAdmin || state?.permissions.includes(permissionKey)) ?? false,
  };

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider");
  return ctx;
}

/** Convenience for a single permission check — `loading` still comes from the surrounding context if needed. */
export function usePermission(permissionKey: string): boolean {
  return usePermissions().can(permissionKey);
}
