"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { logout } from "@/lib/api/auth";

export function Header({
  displayName,
  logoUrl,
  isAuthenticated,
}: {
  displayName: string;
  logoUrl?: string;
  isAuthenticated: boolean;
}) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const navLinks = [
    { href: "/", label: t("home") },
    { href: "/menu", label: t("menu") },
    { href: "/plans", label: t("plans") },
  ];

  function handleLogout() {
    startTransition(async () => {
      await logout();
      router.push("/");
      router.refresh();
    });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-primary-700">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={displayName} className="h-8 w-auto" />
          ) : (
            <span className="text-lg">{displayName}</span>
          )}
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-primary-600 dark:text-zinc-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isPending}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-primary-600 hover:text-primary-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200"
            >
              {t("logout")}
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-zinc-700 hover:text-primary-600 dark:text-zinc-200"
              >
                {t("login")}
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
              >
                {t("signup")}
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="inline-flex items-center justify-center rounded-md p-2 text-zinc-600 md:hidden dark:text-zinc-300"
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            {isMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {isMenuOpen && (
        <div className="border-t border-zinc-200 px-4 py-4 md:hidden dark:border-zinc-800">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={isPending}
                className="text-left text-sm font-medium text-zinc-700 dark:text-zinc-200"
              >
                {t("logout")}
              </button>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  {t("login")}
                </Link>
                <Link href="/signup" className="text-sm font-semibold text-primary-600">
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
