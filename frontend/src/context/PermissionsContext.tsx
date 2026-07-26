"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMyPermissions, type MyPermissions } from "@/lib/api/permissions";

interface PermissionsContextValue extends MyPermissions {
  loading: boolean;
  can: (permissionKey: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MyPermissions | null>(null);

  useEffect(() => {
    getMyPermissions()
      .then(setState)
      .catch(() => setState({ role: "", isSuperAdmin: false, permissions: [] }));
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
