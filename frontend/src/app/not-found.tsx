import Link from "next/link";
import { Compass, UtensilsCrossed } from "lucide-react";

export default function NotFound() {
  return (
    <main className="container-app flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
        <Compass className="h-3.5 w-3.5" />
        404
      </span>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
        Page not found
      </h1>
      <p className="max-w-md text-base text-zinc-600 dark:text-zinc-400">
        We couldn&apos;t find what you were looking for — it may have been moved, renamed, or never
        existed.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="btn-primary">
          Back to home
        </Link>
        <Link href="/menu" className="btn-outline">
          <UtensilsCrossed className="h-4 w-4" />
          Browse the menu
        </Link>
      </div>
    </main>
  );
}
