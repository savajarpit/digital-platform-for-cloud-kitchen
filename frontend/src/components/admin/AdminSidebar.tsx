"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Clock, CreditCard, Lock, MapPin, Store } from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";

const NAV = [
  { href: "/admin/settings/business", label: "Business Profile", icon: Store, permission: PERMISSIONS.BRANDING_EDIT },
  { href: "/admin/settings/hours", label: "Order Hours", icon: Clock, permission: PERMISSIONS.ORDER_HOURS_EDIT },
  { href: "/admin/settings/delivery", label: "Delivery Zones", icon: MapPin, permission: PERMISSIONS.DELIVERY_ZONES_EDIT },
  { href: "/admin/settings/notifications", label: "Notifications", icon: Bell, permission: PERMISSIONS.NOTIFICATIONS_EDIT },
  { href: "/admin/settings/payment", label: "Payment", icon: CreditCard, permission: PERMISSIONS.PAYMENT_EDIT },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { can, loading } = usePermissions();

  return (
    <nav className="flex w-full flex-col gap-1 sm:w-56 sm:shrink-0">
      {NAV.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const editable = loading || can(item.permission);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {!editable && (
              <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-label="View only" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
