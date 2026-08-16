import Link from "next/link";
import type { PublicConfig } from "@/lib/api/settings";

export function HomeCtaSection({ config }: { config: PublicConfig }) {
  if (!config.ctaEnabled) return null;

  return (
    <section className="container-app py-16 sm:py-20">
      <div className="rounded-3xl bg-linear-to-br from-primary-600 to-primary-800 p-8 text-center text-white shadow-glow sm:p-12">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{config.ctaTitle}</h2>
        {config.ctaDescription && (
          <p className="mx-auto mt-3 max-w-xl text-sm text-primary-50 sm:text-base">
            {config.ctaDescription}
          </p>
        )}
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {config.ctaPrimaryLabel && config.ctaPrimaryLink && (
            <Link
              href={config.ctaPrimaryLink}
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-soft transition hover:bg-primary-50"
            >
              {config.ctaPrimaryLabel}
            </Link>
          )}
          {config.ctaSecondaryLabel && config.ctaSecondaryLink && (
            <Link
              href={config.ctaSecondaryLink}
              className="rounded-xl border-2 border-white/70 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {config.ctaSecondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
