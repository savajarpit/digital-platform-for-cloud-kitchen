"use client";

import { useQuery } from "@tanstack/react-query";
import { getPickupInfo } from "@/lib/api/delivery-slots";
import { qk, STALE } from "@/lib/query/keys";
import { useFeatures } from "@/context/FeaturesContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

const LABELS: Record<string, string> = {
  DELIVERY: "Delivery",
  PICKUP: "Pickup",
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
};

/** The Orders page's order-type filter — offers only the types this
 * business actually has (pickup once it's switched on, dine-in/takeaway
 * with that feature), and disappears when delivery is the only one. */
export function OrderTypeFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { has } = useFeatures();
  const { data: pickup } = useQuery({
    queryKey: qk.checkout.pickup,
    queryFn: getPickupInfo,
    staleTime: STALE.long,
  });

  const types = [
    "DELIVERY",
    ...(pickup?.available ? ["PICKUP"] : []),
    ...(has("dine-in") ? ["DINE_IN", "TAKEAWAY"] : []),
  ];
  if (types.length < 2 && !value) return null;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40" aria-label="Order type">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">All order types</SelectItem>
        {types.map((type) => (
          <SelectItem key={type} value={type}>
            {LABELS[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
