"use client";

import { Share2 } from "lucide-react";
import { buildGoogleMapsLink } from "@/lib/format/maps-link";
import { shareOrCopy } from "@/lib/share";
import { useToast } from "@/context/ToastContext";

export interface ShareableAddress {
  label?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  contactPhone?: string | null;
  lat?: number | null;
  lng?: number | null;
}

function formatAddressText(address: ShareableAddress): string {
  return [
    address.label || null,
    `${address.line1}${address.line2 ? `, ${address.line2}` : ""}`,
    `${address.city}, ${address.state} — ${address.pincode}`,
    address.contactPhone ? `Phone: ${address.contactPhone}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Share a delivery address through the OS share sheet — pick an app
 * (WhatsApp, etc.), then a contact, then send, same flow as any native
 * "share" button. Falls back to copying the address (plus a map link, if
 * coordinates were captured) to the clipboard where Web Share isn't
 * available (most desktop browsers). */
export function ShareAddressButton({
  address,
  className = "",
}: {
  address: ShareableAddress;
  className?: string;
}) {
  const { showToast } = useToast();

  async function handleShare() {
    const mapUrl =
      address.lat != null && address.lng != null
        ? buildGoogleMapsLink(address.lat, address.lng)
        : undefined;
    await shareOrCopy(
      { title: "Delivery address", text: formatAddressText(address), url: mapUrl },
      { showToast },
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex cursor-pointer items-center gap-1 text-primary-600 hover:underline dark:text-primary-400 ${className}`}
      aria-label="Share address"
    >
      <Share2 className="h-3.5 w-3.5" />
      Share
    </button>
  );
}
