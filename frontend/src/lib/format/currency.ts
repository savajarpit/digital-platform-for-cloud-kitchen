/** Formats an integer paise amount (e.g. 24900) as a localized currency string. */
export function formatPriceFromPaise(priceInPaise: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
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
