/** One shared, static FSSAI (Food Safety and Standards Authority of India)
 * compliance mark — the same logo file for every tenant, never tenant-
 * uploaded. Source image: public/FSSAI_logo.webp (450×221, ~2.04:1). */
export function FssaiBadge({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/FSSAI_logo.webp" alt="FSSAI" className={className} />
  );
}
