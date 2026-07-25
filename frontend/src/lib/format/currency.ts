/** Formats an integer paise amount (e.g. 24900) as a localized currency string. */
export function formatPriceFromPaise(priceInPaise: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(priceInPaise / 100);
}
