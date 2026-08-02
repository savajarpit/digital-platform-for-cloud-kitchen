"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarClock, Leaf, LayoutDashboard, LogOut, MapPin, Menu, Package, ShoppingCart, User as UserIcon, X } from "lucide-react";
import { logout } from "@/lib/api/auth";
import { useToast } from "@/context/ToastContext";
import { useCartCount } from "@/lib/store/cart-store";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

export function Header({
  displayName,
  logoUrl,
  isAuthenticated,
  isAdmin,
}: {
  displayName: string;
  logoUrl?: string;
  isAuthenticated: boolean;
  isAdmin?: boolean;
}) {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const cartCount = useCartCount();

  const navLinks = [
    { href: "/", label: t("home") },
    { href: "/menu", label: t("menu") },
    { href: "/plans", label: t("plans") },
  ];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  function handleLogout() {
    startTransition(async () => {
      await logout();
      showToast("Logged out", "info");
      router.push("/");
      router.refresh();
    });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur-lg print:hidden dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="container-app flex h-16 items-center justify-between sm:h-18">
        <Link href="/" className="group flex items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={displayName} className="h-9 w-auto" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 shadow-glow transition-transform group-hover:scale-110">
              <Leaf className="h-5 w-5 text-white" />
            </div>
          )}
          <span className="font-display text-lg font-bold text-zinc-900 sm:text-xl dark:text-zinc-100">
            {displayName}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-primary-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Link
            href="/cart"
            className="relative rounded-lg p-2.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label={t("cart")}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
          {isAuthenticated ? (
            <UserMenu isAdmin={isAdmin} />
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {t("login")}
              </Link>
              <Link href="/signup" className="btn-primary btn-sm">
                {t("signup")}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Link
            href="/cart"
            className="relative rounded-lg p-2.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label={t("cart")}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="rounded-lg p-2.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="border-t border-zinc-200 px-4 py-4 md:hidden dark:border-zinc-800">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-4 py-3 text-sm font-medium ${
                  isActive(link.href)
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <div className="mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-800" />
                <Link
                  href="/account/profile"
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <UserIcon className="h-4 w-4" />
                  {t("profile")}
                </Link>
                <Link
                  href="/orders"
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Package className="h-4 w-4" />
                  {t("myOrders")}
                </Link>
                <Link
                  href="/account/addresses"
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <MapPin className="h-4 w-4" />
                  {t("myAddresses")}
                </Link>
                <Link
                  href="/account/subscriptions"
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <CalendarClock className="h-4 w-4" />
                  {t("mySubscriptions")}
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {t("admin")}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <LogOut className="h-4 w-4" />
                  {t("logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("login")}
                </Link>
                <Link href="/signup" className="btn-primary mt-2" onClick={() => setIsMenuOpen(false)}>
                  {t("signup")}
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
