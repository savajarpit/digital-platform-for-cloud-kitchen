import { InvoiceSkeleton } from "@/components/invoice/InvoiceSkeleton";

export default function SubscriptionInvoiceLoading() {
  return <InvoiceSkeleton itemRows={1} summaryRows={1} wideTable={false} />;
}
