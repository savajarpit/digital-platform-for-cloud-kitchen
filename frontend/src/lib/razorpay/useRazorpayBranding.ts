"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPublicConfig } from "@/lib/api/settings-client";
import { ApiError } from "@/lib/api/client";
import { getMyProfile } from "@/lib/api/users";
import { qk, STALE } from "@/lib/query/keys";

type Branding = {
  name: string;
  image?: string;
  prefill: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
};

/** What a customer-facing Razorpay checkout should show: the business's own
 * name, logo and brand colour instead of a generic title, and the customer's
 * name/email/mobile pre-filled so Razorpay doesn't ask for them again. The
 * mobile comes from their profile (captured at signup), falling back to the
 * delivery address's contact phone. */
export function useRazorpayBranding(): (fallbackPhone?: string | null) => Branding {
  const { data: config } = useQuery({
    queryKey: qk.config.public,
    queryFn: fetchPublicConfig,
    staleTime: STALE.long,
  });
  const { data: profile } = useQuery({
    queryKey: qk.profile.all,
    queryFn: getMyProfile,
    staleTime: STALE.long,
    // Logged-out visitors never reach a checkout; don't retry a 401.
    retry: (count, err) => !(err instanceof ApiError && err.status === 401) && count < 2,
  });

  return (fallbackPhone) => {
    const contact = profile?.phone || fallbackPhone || undefined;
    const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || undefined;
    return {
      name: config?.displayName ?? "Checkout",
      image: config?.logoUrl || undefined,
      prefill: { name, email: profile?.email, contact },
      theme: config?.themeConfig?.primaryColor ? { color: config.themeConfig.primaryColor } : undefined,
    };
  };
}
