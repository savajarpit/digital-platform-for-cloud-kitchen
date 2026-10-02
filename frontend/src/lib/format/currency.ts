/** Formats an integer paise amount (e.g. 24900) as a localized currency string.
 * Whole rupees stay clean ("₹249"); anything with paise shows them exactly
 * ("₹244.10") — rounding would show the customer a different amount than
 * Razorpay actually charges (e.g. after a 10% discount on ₹249). */
export function formatPriceFromPaise(priceInPaise: number, currency = "INR"): string {
  const digits = Math.round(priceInPaise) % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(priceInPaise / 100);
}

/** Compact form ("₹1.2K") for a paise amount — for tight spaces like a bar-chart label. */
export function formatCompactPriceFromPaise(priceInPaise: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(priceInPaise / 100);
}
