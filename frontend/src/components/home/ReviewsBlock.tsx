"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import type { PublicReview } from "@/lib/api/reviews";

export function ReviewsBlock({ reviews }: { reviews: PublicReview[] }) {
  const [active, setActive] = useState(0);

  if (reviews.length === 0) return null;
  const review = reviews[active];

  return (
    <section className="bg-zinc-50 py-12 sm:py-16 dark:bg-zinc-900/50">
      <div className="container-app">
        <h2 className="section-title text-center text-zinc-900 dark:text-zinc-100">
          What our customers say
        </h2>

        <div className="mx-auto mt-8 max-w-3xl">
          <div className="card relative p-8 text-center sm:p-10">
            <Quote className="mx-auto mb-4 h-10 w-10 text-primary-600/20" />
            <div className="mb-4 flex justify-center gap-0.5 text-amber-400">
              {Array.from({ length: review.rating }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-amber-400" />
              ))}
            </div>
            {review.comment && (
              <p className="mb-6 min-w-0 text-lg leading-relaxed font-medium text-balance wrap-break-word text-zinc-900 sm:text-xl dark:text-zinc-100">
                &ldquo;{review.comment}&rdquo;
              </p>
            )}
            <p className="min-w-0 wrap-break-word font-bold text-zinc-900 dark:text-zinc-100">{review.authorName}</p>
          </div>

          {reviews.length > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setActive((p) => (p - 1 + reviews.length) % reviews.length)}
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label="Previous review"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex gap-2">
                {reviews.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Show review ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      i === active ? "w-8 bg-primary-600" : "w-2 bg-zinc-300 dark:bg-zinc-700"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setActive((p) => (p + 1) % reviews.length)}
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label="Next review"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
