"use client";

import { Share2 } from "lucide-react";
import { buildGoogleMapsLink } from "@/lib/format/maps-link";
import { shareOrCopy } from "@/lib/share";
import { useToast } from "@/context/ToastContext";
import type { ShareableAddress } from "@/components/ui/ShareAddressButton";

export interface ShareableOrderDetails {
  /** e.g. "Order #ABC123" or "Delivery — 7-Day Weight Loss Plan" */
  heading: string;
  customerName?: string;
  /** Pre-formatted lines, e.g. "Paneer Tikka Millet Bowl x2" — callers
   * already have this shape (order items, or a dispatch card's meal list),
   * so this button doesn't re-derive it from separate name/quantity pairs. */
  itemLines: string[];
  deliverySlotName?: string | null;
  deliveryWindowStart?: string | null;
  deliveryWindowEnd?: string | null;
  deliveryDateLabel?: string | null;
  totalLabel?: string | null;
  /** Customer prep/customization note, if any — e.g. "no onions." */
  note?: string | null;
  /** Omit for a pickup order (nothing to deliver to) and use pickupAddress
   * instead — exactly one of the two should be set. */
  address?: ShareableAddress;
  /** A pickup order's zone address, when there's no customer address at all. */
  pickupAddress?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
}

function formatOrderText(details: ShareableOrderDetails): string {
  const windowLabel =
    details.deliveryWindowStart && details.deliveryWindowEnd
      ? ` (${details.deliveryWindowStart}–${details.deliveryWindowEnd})`
      : "";
  const scheduleLine = [details.deliveryDateLabel, details.deliverySlotName ? `${details.deliverySlotName}${windowLabel}` : null]
    .filter(Boolean)
    .join(" · ");

  const locationLines = details.address
    ? [
        "Deliver to:",
        `${details.address.line1}${details.address.line2 ? `, ${details.address.line2}` : ""}, ${details.address.city}, ${details.address.state} — ${details.address.pincode}`,
        details.address.contactPhone ? `Phone: ${details.address.contactPhone}` : null,
      ]
    : ["Pickup at:", details.pickupAddress ?? "Pickup location"];

  return [
    details.heading,
    details.customerName ? `Customer: ${details.customerName}` : null,
    scheduleLine || null,
    "",
    "Items:",
    ...details.itemLines.map((line) => `- ${line}`),
    details.totalLabel ? "" : null,
    details.totalLabel ? `Total: ${details.totalLabel}` : null,
    details.note ? "" : null,
    details.note ? `Note: ${details.note}` : null,
    "",
    ...locationLines,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/** Copy/share a full order or per-day delivery summary — same field set as
 * the WhatsApp/email notification the tenant already gets on order
 * confirmation (customer, items, slot/date, address, phone) — so an admin
 * can forward the exact same details to a driver or anyone else directly
 * from the admin UI, through the OS share sheet or the clipboard. */
export function ShareOrderDetailsButton({
  details,
  className = "",
}: {
  details: ShareableOrderDetails;
  className?: string;
}) {
  const { showToast } = useToast();

  async function handleShare() {
    const lat = details.address ? details.address.lat : details.pickupLat;
    const lng = details.address ? details.address.lng : details.pickupLng;
    const mapUrl = lat != null && lng != null ? buildGoogleMapsLink(lat, lng) : undefined;
    await shareOrCopy({ title: details.heading, text: formatOrderText(details), url: mapUrl }, { showToast });
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex cursor-pointer items-center gap-1 text-primary-600 hover:underline dark:text-primary-400 ${className}`}
      aria-label="Share order details"
    >
      <Share2 className="h-3.5 w-3.5" />
      Share order details
    </button>
  );
}
