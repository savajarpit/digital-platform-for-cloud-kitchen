"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarClock,
  Clock,
  CreditCard,
  FileText,
  Gauge,
  LayoutGrid,
  Lock,
  MapPin,
  Package,
  Store,
  Tag,
  UserPlus,
  Users,
  UtensilsCrossed,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";
import { useFeatures } from "@/context/FeaturesContext";
import { PERMISSIONS } from "@/lib/constants/permissions";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Omit for a page with no fine-grained permission of its own (e.g. a
   * self-serve action every admin role can use) — it always renders
   * editable, never shows the view-only lock icon. */
  permission?: string;
  /** Tenant-level entitlement (SUPER_ADMIN-granted, distinct from
   * `permission` above) — when the tenant doesn't have this feature the
   * link is hidden entirely, not just shown view-only. */
  feature?: string;
}

const OPERATIONS_NAV: NavItem[] = [
  { href: "/admin/overview", label: "Overview", icon: BarChart3, permission: PERMISSIONS.ORDERS_MANAGE },
  { href: "/admin/home", label: "Home Page", icon: LayoutGrid, permission: PERMISSIONS.MENU_MANAGE },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed, permission: PERMISSIONS.MENU_MANAGE },
  { href: "/admin/orders", label: "Orders", icon: Package, permission: PERMISSIONS.ORDERS_MANAGE },
  { href: "/admin/promotions", label: "Promotions", icon: Tag, permission: PERMISSIONS.PROMOTIONS_MANAGE, feature: "promotions" },
  { href: "/admin/subscriptions", label: "Subscription Plans", icon: CalendarClock, permission: PERMISSIONS.SUBSCRIPTIONS_MANAGE },
  { href: "/admin/customers", label: "Customers", icon: Users, permission: PERMISSIONS.CUSTOMERS_VIEW },
];

const SETTINGS_NAV: NavItem[] = [
  { href: "/admin/settings/business", label: "Business Profile", icon: Store, permission: PERMISSIONS.BRANDING_EDIT },
  { href: "/admin/settings/hours", label: "Order Hours", icon: Clock, permission: PERMISSIONS.ORDER_HOURS_EDIT },
  { href: "/admin/settings/delivery", label: "Delivery Zones", icon: MapPin, permission: PERMISSIONS.DELIVERY_ZONES_EDIT },
  { href: "/admin/settings/notifications", label: "Notifications", icon: Bell, permission: PERMISSIONS.NOTIFICATIONS_EDIT },
  { href: "/admin/settings/payment", label: "Payment", icon: CreditCard, permission: PERMISSIONS.PAYMENT_EDIT },
  { href: "/admin/settings/content", label: "Legal Pages", icon: FileText, permission: PERMISSIONS.CONTENT_EDIT },
  { href: "/admin/settings/plan", label: "My Plan", icon: Gauge },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { can, loading, isSuperAdmin } = usePermissions();
  const { has: hasFeature, loading: featuresLoading } = useFeatures();

  function renderLink(item: NavItem) {
    if (item.feature && !featuresLoading && !hasFeature(item.feature)) return null;
    const isActive = pathname.startsWith(item.href);
    const editable = !item.permission || loading || can(item.permission);
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
          <Link
            href="/admin/platform/plans"
            className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
              pathname.startsWith("/admin/platform/plans")
                ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            <Gauge className="h-4 w-4 shrink-0" />
            <span className="flex-1">Platform Plans</span>
          </Link>
          <Link
            href="/admin/platform/leads"
            className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
              pathname.startsWith("/admin/platform/leads")
                ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            <span className="flex-1">Leads</span>
          </Link>
          <Link
            href="/admin/platform/cancellation-requests"
            className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
              pathname.startsWith("/admin/platform/cancellation-requests")
                ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            <XCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">Cancellation Requests</span>
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
