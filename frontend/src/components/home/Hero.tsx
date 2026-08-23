import Link from "next/link";
import { ArrowRight, Clock, Leaf, ShieldCheck, Star, Truck } from "lucide-react";
import type { PublicConfig } from "@/lib/api/settings";

export function Hero({
  config,
  heroCtaLabel,
  viewPlansLabel,
  showPlansCta,
  reviewAvg,
  reviewCount,
}: {
  config: PublicConfig;
  heroCtaLabel: string;
  viewPlansLabel: string;
  showPlansCta: boolean;
  reviewAvg: number | null;
  reviewCount: number;
}) {
  const images = config.heroImageUrls.slice(0, 4);
  const hasImages = images.length > 0;

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-primary-50 via-white to-accent-50 dark:from-primary-950 dark:via-zinc-950 dark:to-zinc-900" />
      <div className="absolute top-20 right-0 z-0 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl dark:bg-primary-900/30" />

      <div
        className={`container-app relative grid gap-10 py-16 sm:py-24 ${
          hasImages ? "items-center text-center lg:grid-cols-2 lg:text-left" : "justify-items-center text-center"
        }`}
      >
        <div className={`flex flex-col gap-6 ${hasImages ? "items-center lg:items-start" : "items-center"}`}>
          <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
            <Leaf className="h-3.5 w-3.5" />
            {config.heroTagline}
          </span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl md:text-6xl dark:text-zinc-50">
            {config.heroTitle ?? config.displayName}
          </h1>
          <p className="max-w-md text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
            {config.heroSubtitle}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/menu" className="btn-primary btn-lg">
              {heroCtaLabel}
              <ArrowRight className="h-5 w-5" />
            </Link>
            {showPlansCta && (
              <Link href="/plans" className="btn-outline btn-lg">
                {viewPlansLabel}
              </Link>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-5 lg:justify-start">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary-600" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Free delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary-600" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Fresh guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary-600" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Cancel anytime</span>
            </div>
          </div>
        </div>

        {hasImages && (
          <div className="relative hidden animate-scale-in lg:block">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                {images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={images[0]}
                    alt={config.displayName}
                    className="aspect-square w-full rounded-3xl object-cover shadow-soft"
                  />
                )}
                {images[1] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={images[1]}
                    alt={config.displayName}
                    className="aspect-4/5 w-full rounded-3xl object-cover shadow-soft"
                  />
                )}
              </div>
              <div className="space-y-4 pt-8">
                {images[2] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={images[2]}
                    alt={config.displayName}
                    className="aspect-4/5 w-full rounded-3xl object-cover shadow-soft"
                  />
                )}
                {images[3] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={images[3]}
                    alt={config.displayName}
                    className="aspect-square w-full rounded-3xl object-cover shadow-soft"
                  />
                )}
              </div>
            </div>

            {reviewCount > 0 && reviewAvg !== null && (
              <div className="card absolute -bottom-4 -left-4 flex items-center gap-3 p-4 shadow-soft">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600">
                  <Star className="h-6 w-6 fill-white text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {reviewAvg.toFixed(1)}/5
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {reviewCount.toLocaleString()} review{reviewCount === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
