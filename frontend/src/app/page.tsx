import { getTranslations } from "next-intl/server";
import { getPublicConfig } from "@/lib/api/settings";

export default async function Home() {
  const [config, t] = await Promise.all([
    getPublicConfig(),
    getTranslations("home"),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary-700 sm:text-4xl md:text-5xl">
          {config.displayName}
        </h1>
        <p className="max-w-md text-base text-zinc-600 sm:text-lg">
          Fresh, healthy meals delivered to your door.
        </p>
        <a
          href="/menu"
          className="inline-flex items-center justify-center rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 sm:text-base"
        >
          {t("heroCta")}
        </a>
      </section>
    </main>
  );
}
