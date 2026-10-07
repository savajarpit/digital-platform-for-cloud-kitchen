/** Order statuses read differently per order type: READY is "Ready for
 * delivery" on a delivery but "Ready to serve" at a table, and DELIVERED is
 * "Picked up" for a pickup. One place so the customer's order page, the
 * admin screens and the kitchen all say the same thing. */

type FulfillmentType = "DELIVERY" | "PICKUP" | "DINE_IN" | "TAKEAWAY";

const READY_LABEL: Record<FulfillmentType, string> = {
  DELIVERY: "Ready for delivery",
  PICKUP: "Ready for pickup",
  DINE_IN: "Ready to serve",
  TAKEAWAY: "Ready for pickup",
};

const DONE_LABEL: Record<FulfillmentType, string> = {
  DELIVERY: "Delivered",
  PICKUP: "Picked up",
  DINE_IN: "Served",
  TAKEAWAY: "Picked up",
};

const BASE_LABEL: Record<string, string> = {
  // Only ever listed for a staff-taken cash/UPI order (cash on delivery).
  PENDING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "Out for delivery",
  CANCELLED: "Cancelled",
};

export function orderStatusLabel(
  status: string,
  fulfillmentType: string = "DELIVERY",
): string {
  const type = (
    fulfillmentType in READY_LABEL ? fulfillmentType : "DELIVERY"
  ) as FulfillmentType;
  if (status === "READY") return READY_LABEL[type];
  if (status === "DELIVERED") return DONE_LABEL[type];
  // Older pickup orders used "out for delivery" to mean ready to collect.
  if (status === "OUT_FOR_DELIVERY" && type !== "DELIVERY")
    return READY_LABEL[type];
  return BASE_LABEL[status] ?? status.replace(/_/g, " ").toLowerCase();
}
