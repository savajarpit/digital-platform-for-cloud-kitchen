import { Star } from "lucide-react";
import type { PublicReview } from "@/lib/api/reviews";

export function ReviewsBlock({ reviews }: { reviews: PublicReview[] }) {
  return (
    <section className="container-app py-16 sm:py-20">
      <h2 className="section-title text-center text-zinc-900 dark:text-zinc-100">
        What our customers say
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review, index) => (
          <article
            key={review.id}
            className="card flex flex-col gap-3 p-6 opacity-0 animate-fade-up"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="flex items-center gap-0.5 text-amber-400">
              {Array.from({ length: review.rating }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400" />
              ))}
            </div>
            {review.comment && (
              <p className="flex-1 text-sm text-zinc-600 dark:text-zinc-400">&ldquo;{review.comment}&rdquo;</p>
            )}
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{review.authorName}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
