import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { PublicConfig } from "@/lib/api/settings";

export async function Footer({ config }: { config: PublicConfig }) {
  const t = await getTranslations("nav");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {config.displayName}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            &copy; {year} {config.displayName}. All rights reserved.
          </span>
        </div>
        <nav className="flex gap-6 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/menu" className="hover:text-primary-600">
            {t("menu")}
          </Link>
          <Link href="/plans" className="hover:text-primary-600">
            {t("plans")}
          </Link>
        </nav>
      </div>
      <div className="border-t border-zinc-200 px-4 py-3 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
        Powered by {process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "our platform"} — orders and
        content on this site are provided by {config.displayName}.
      </div>
    </footer>
  );
}
