"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarClock, LayoutDashboard, LogOut, MapPin, Package, User as UserIcon } from "lucide-react";
import { logout } from "@/lib/api/auth";
import { useToast } from "@/context/ToastContext";

export function UserMenu({
  isAdmin,
  hasSubscriptions,
}: {
  isAdmin?: boolean;
  hasSubscriptions?: boolean;
}) {
  const t = useTranslations("nav");
  const router = useRouter();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function handleLogout() {
    setIsOpen(false);
    startTransition(async () => {
      await logout();
      showToast("Logged out", "info");
      router.push("/");
      router.refresh();
    });
  }

  const links = [
    { href: "/account/profile", label: t("profile"), icon: UserIcon },
    { href: "/orders", label: t("myOrders"), icon: Package },
    { href: "/account/addresses", label: t("myAddresses"), icon: MapPin },
    ...(hasSubscriptions
      ? [{ href: "/account/subscriptions", label: t("mySubscriptions"), icon: CalendarClock }]
      : []),
    ...(isAdmin ? [{ href: "/admin", label: t("admin"), icon: LayoutDashboard }] : []),
  ];

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={t("account")}
        aria-expanded={isOpen}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-700 transition-colors hover:bg-primary-100 dark:bg-primary-950 dark:text-primary-400 dark:hover:bg-primary-900"
      >
        <UserIcon className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <link.icon className="h-4 w-4 text-zinc-400" />
              {link.label}
            </Link>
          ))}
          <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}
