"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

/** A meal's photo filling its (caller-sized) box, or the "no image" icon —
 * also when the photo fails to load (deleted file, moved storage), instead
 * of a broken-image glyph with the alt text spilling out. */
export function MealThumb({
  src,
  alt,
  iconClassName = "h-5 w-5",
}: {
  src: string | null | undefined;
  alt: string;
  iconClassName?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <span className="flex h-full w-full items-center justify-center">
        <ImageOff
          className={`${iconClassName} text-zinc-300 dark:text-zinc-600`}
          strokeWidth={1.5}
          aria-hidden
        />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  );
}
