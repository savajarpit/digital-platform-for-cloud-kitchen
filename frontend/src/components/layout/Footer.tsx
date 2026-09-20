import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Mail, MapPin, Phone } from "lucide-react";
import type { PublicConfig } from "@/lib/api/settings";
import type { StaticPageSummary } from "@/lib/api/content";
import type { PublicSocialLink } from "@/lib/api/social-links";
import { SocialIcon } from "@/components/icons/SocialIcon";
import { FssaiBadge } from "@/components/icons/FssaiBadge";
import { BrandLockup } from "./BrandLockup";

export async function Footer({
  config,
  pages,
  socialLinks,
  subscriptionsEnabled,
}: {
  config: PublicConfig;
  pages: StaticPageSummary[];
  socialLinks: PublicSocialLink[];
  subscriptionsEnabled: boolean;
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

  const { footerBgColor, footerTextColor } = config.themeConfig;
  // Unset = today's look (zinc-900 / black-in-dark bg, zinc text tiers); a
  // custom text color flows through --footer-fg, which each text tier below
  // falls back from, so the defaults are untouched.
  const footerStyle = {
    ...(footerBgColor ? { backgroundColor: footerBgColor } : {}),
    ...(footerTextColor ? { color: footerTextColor, "--footer-fg": footerTextColor } : {}),
  } as React.CSSProperties;

  return (
    <footer
      className="bg-zinc-900 text-zinc-300 print:hidden dark:bg-black"
      style={footerStyle}
    >
      <div className="container-app pt-20 pb-12 sm:pb-16">
        <div className={`grid grid-cols-1 gap-8 sm:gap-10 ${gridColsClass[columnCount]}`}>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BrandLockup
                mode={config.footerDisplayMode}
                logoUrl={config.logoUrl}
                displayName={config.displayName}
                heightPx={config.footerLogoHeightPx}
                widthPx={config.footerLogoWidthPx}
                nameColor={config.footerNameColor}
                variant="footer"
              />
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-(--footer-fg,var(--color-zinc-400))">
              {config.description || "Fresh, healthy meals delivered to your door."}
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.platform}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,currentColor_15%,transparent)] transition-colors hover:bg-primary-600 hover:text-white"
                  >
                    <SocialIcon platform={link.platform} className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-(--footer-fg,#ffffff)">Explore</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/menu" className="transition-colors hover:text-primary-400">
                  {t("menu")}
                </Link>
              </li>
              {subscriptionsEnabled && (
                <li>
                  <Link href="/plans" className="transition-colors hover:text-primary-400">
                    {t("plans")}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {pages.length > 0 && (
            <div>
              <h4 className="mb-4 font-semibold text-(--footer-fg,#ffffff)">Legal</h4>
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
              <h4 className="mb-4 font-semibold text-(--footer-fg,#ffffff)">Contact</h4>
              <ul className="space-y-3 text-sm">
                {config.supportPhone && (
                  <li className="flex min-w-0 items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" />
                    <a
                      href={`tel:${config.supportPhone}`}
                      className="min-w-0 wrap-break-word transition-colors hover:text-primary-400"
                    >
                      {config.supportPhone}
                    </a>
                  </li>
                )}
                {config.supportEmail && (
                  <li className="flex min-w-0 items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" />
                    <a
                      href={`mailto:${config.supportEmail}`}
                      className="min-w-0 wrap-break-word transition-colors hover:text-primary-400"
                    >
                      {config.supportEmail}
                    </a>
                  </li>
                )}
                {config.addressLine1 && (
                  <li className="flex min-w-0 items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" />
                    <span className="min-w-0 wrap-break-word">{config.addressLine1}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[color-mix(in_srgb,currentColor_20%,transparent)] pt-6 text-sm sm:flex-row">
          <p className="opacity-70">
            &copy; {year} {config.displayName}. All rights reserved.
          </p>
          {config.fssaiLicenseNumber && (
            <div className="flex items-center gap-2 text-xs text-(--footer-fg,var(--color-zinc-400))">
              <span className="flex h-7 shrink-0 items-center rounded bg-white px-1.5">
                <FssaiBadge className="h-4 w-auto" />
              </span>
              <span>FSSAI Lic. No: {config.fssaiLicenseNumber}</span>
            </div>
          )}
          {config.poweredByBrandingEnabled && (
            <p className="text-xs opacity-70">
              Powered by{" "}
              <a
                href="https://okaysync.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline transition-colors hover:text-primary-400"
              >
                OkaySync
              </a>{" "}
              — orders and content on this site are provided by {config.displayName}.
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
