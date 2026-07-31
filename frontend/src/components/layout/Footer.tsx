import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Leaf, Mail, MapPin, Phone } from "lucide-react";
import type { PublicConfig } from "@/lib/api/settings";
import type { StaticPageSummary } from "@/lib/api/content";

export async function Footer({
  config,
  pages,
}: {
  config: PublicConfig;
  pages: StaticPageSummary[];
}) {
  const t = await getTranslations("nav");
  const year = new Date().getFullYear();
  const hasContact = config.supportEmail || config.supportPhone || config.addressLine1;
  const columnCount = 2 + (hasContact ? 1 : 0) + (pages.length > 0 ? 1 : 0);
  // Tailwind can't see dynamically-built class names, so the grid width is
  // picked from a static lookup rather than string-interpolating the class.
  const gridColsClass: Record<number, string> = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-4",
  };

  return (
    <footer className="mt-20 bg-zinc-900 text-zinc-300 print:hidden dark:bg-black">
      <div className="container-app py-12 sm:py-16">
        <div className={`grid grid-cols-1 gap-8 sm:gap-10 ${gridColsClass[columnCount]}`}>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <span className="font-display text-lg font-bold text-white">{config.displayName}</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-zinc-400">
              Fresh, healthy meals delivered to your door.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Explore</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/menu" className="transition-colors hover:text-primary-400">
                  {t("menu")}
                </Link>
              </li>
              <li>
                <Link href="/plans" className="transition-colors hover:text-primary-400">
                  {t("plans")}
                </Link>
              </li>
            </ul>
          </div>

          {pages.length > 0 && (
            <div>
              <h4 className="mb-4 font-semibold text-white">Legal</h4>
              <ul className="space-y-2.5 text-sm">
                {pages.map((page) => (
                  <li key={page.id}>
                    <Link href={`/legal/${page.slug}`} className="transition-colors hover:text-primary-400">
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasContact && (
            <div>
              <h4 className="mb-4 font-semibold text-white">Contact</h4>
              <ul className="space-y-3 text-sm">
                {config.supportPhone && (
                  <li className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" />
                    <span>{config.supportPhone}</span>
                  </li>
                )}
                {config.supportEmail && (
                  <li className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" />
                    <span>{config.supportEmail}</span>
                  </li>
                )}
                {config.addressLine1 && (
                  <li className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" />
                    <span>{config.addressLine1}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-zinc-800 pt-6 text-sm text-zinc-500 sm:flex-row">
          <p>
            &copy; {year} {config.displayName}. All rights reserved.
          </p>
          <p className="text-xs text-zinc-600">
            Powered by {process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "our platform"} — orders and content
            on this site are provided by {config.displayName}.
          </p>
        </div>
      </div>
    </footer>
  );
}
