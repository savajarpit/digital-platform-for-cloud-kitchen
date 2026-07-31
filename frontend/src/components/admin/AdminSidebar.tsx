"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  Clock,
  CreditCard,
  FileText,
  Lock,
  MapPin,
  Package,
  Store,
  Tag,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";
import { PERMISSIONS } from "@/lib/constants/permissions";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: string;
}

const OPERATIONS_NAV: NavItem[] = [
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed, permission: PERMISSIONS.MENU_MANAGE },
  { href: "/admin/orders", label: "Orders", icon: Package, permission: PERMISSIONS.ORDERS_MANAGE },
  { href: "/admin/promotions", label: "Promotions", icon: Tag, permission: PERMISSIONS.PROMOTIONS_MANAGE },
  { href: "/admin/customers", label: "Customers", icon: Users, permission: PERMISSIONS.CUSTOMERS_VIEW },
];

const SETTINGS_NAV: NavItem[] = [
  { href: "/admin/settings/business", label: "Business Profile", icon: Store, permission: PERMISSIONS.BRANDING_EDIT },
  { href: "/admin/settings/hours", label: "Order Hours", icon: Clock, permission: PERMISSIONS.ORDER_HOURS_EDIT },
  { href: "/admin/settings/delivery", label: "Delivery Zones", icon: MapPin, permission: PERMISSIONS.DELIVERY_ZONES_EDIT },
  { href: "/admin/settings/notifications", label: "Notifications", icon: Bell, permission: PERMISSIONS.NOTIFICATIONS_EDIT },
  { href: "/admin/settings/payment", label: "Payment", icon: CreditCard, permission: PERMISSIONS.PAYMENT_EDIT },
  { href: "/admin/settings/content", label: "Legal Pages", icon: FileText, permission: PERMISSIONS.CONTENT_EDIT },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { can, loading, isSuperAdmin } = usePermissions();

  function renderLink(item: NavItem) {
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
        {!editable && <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-label="View only" />}
      </Link>
    );
  }

  return (
    <nav className="flex w-full flex-col gap-1 sm:w-56 sm:shrink-0">
      {isSuperAdmin && (
        <>
          <Link
            href="/admin/platform/tenants"
            className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
              pathname.startsWith("/admin/platform")
                ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="flex-1">Platform (Tenants)</span>
          </Link>
          <Link
            href="/admin/platform/terms"
            className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
              pathname.startsWith("/admin/platform/terms")
                ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="flex-1">Platform Terms</span>
          </Link>
          <Link
            href="/admin/platform/pages"
            className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
              pathname.startsWith("/admin/platform/pages")
                ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="flex-1">Platform Pages</span>
          </Link>
          <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
        </>
      )}
      {OPERATIONS_NAV.map(renderLink)}
      <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
      {SETTINGS_NAV.map(renderLink)}
    </nav>
  );
}
