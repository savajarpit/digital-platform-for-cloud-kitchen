import { InvoiceSkeleton } from "@/components/invoice/InvoiceSkeleton";

export default function OrderInvoiceLoading() {
  return <InvoiceSkeleton itemRows={2} summaryRows={3} wideTable />;
}
