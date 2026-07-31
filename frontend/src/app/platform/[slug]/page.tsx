import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedPlatformPage } from "@/lib/api/platform-pages";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedPlatformPage(slug);
  return { title: page?.title ?? "Page not found" };
}

export default async function PlatformPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublishedPlatformPage(slug);
  if (!page) notFound();

  return (
    <main className="flex-1 px-4 py-12 sm:px-6">
      <div className="container-app max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {page.title}
        </h1>
        <div className="mt-6 text-sm leading-relaxed whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
          {page.content}
        </div>
      </div>
    </main>
  );
}
