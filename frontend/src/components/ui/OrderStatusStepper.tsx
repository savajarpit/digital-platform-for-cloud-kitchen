import { Check } from "lucide-react";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

interface Stage {
  status: OrderStatus;
  label: string;
}

const DELIVERY_STAGES: Stage[] = [
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "PREPARING", label: "Preparing" },
  { status: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { status: "DELIVERED", label: "Delivered" },
];

const PICKUP_STAGES: Stage[] = [
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "PREPARING", label: "Preparing" },
  { status: "OUT_FOR_DELIVERY", label: "Ready for Pickup" },
  { status: "DELIVERED", label: "Picked Up" },
];

/** Visual stage-progress indicator for an order's lifecycle. Reuses the
 * existing OrderStatus enum values as-is (OUT_FOR_DELIVERY/DELIVERED just
 * get pickup-appropriate labels) — no new backend states. CANCELLED is a
 * terminal override, not a stage on the line, matching how the admin
 * order page already treats DELIVERED/CANCELLED as final states. */
export function OrderStatusStepper({
  status,
  fulfillmentType,
}: {
  status: OrderStatus;
  fulfillmentType: "PICKUP" | "DELIVERY";
}) {
  if (status === "CANCELLED") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50/50 px-3.5 py-2.5 text-center text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
        Order cancelled
      </div>
    );
  }
  if (status === "PENDING_PAYMENT") return null;

  const stages = fulfillmentType === "PICKUP" ? PICKUP_STAGES : DELIVERY_STAGES;
  const activeIndex = stages.findIndex((s) => s.status === status);

  return (
    <div className="flex items-center">
      {stages.map((stage, i) => {
        const done = i < activeIndex;
        const current = i === activeIndex;
        return (
          <div key={stage.status} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
                  done
                    ? "border-primary-600 bg-primary-600 text-white"
                    : current
                      ? "border-primary-600 bg-white text-primary-600 dark:bg-zinc-900"
                      : "border-zinc-200 bg-white text-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-600"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={`w-16 text-center text-[11px] leading-tight ${
                  done || current
                    ? "font-medium text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-400 dark:text-zinc-600"
                }`}
              >
                {stage.label}
              </span>
            </div>
            {i < stages.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 rounded transition-colors ${
                  done ? "bg-primary-600" : "bg-zinc-200 dark:bg-zinc-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
