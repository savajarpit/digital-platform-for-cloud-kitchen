"use client";

import Link from "next/link";
import { ArrowLeft, ClipboardPlus } from "lucide-react";
import { ManualOrderForm } from "@/components/admin/ManualOrderForm";

export default function NewManualOrderPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/orders"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-primary-600 dark:text-zinc-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </Link>

      <div className="flex items-center gap-2 text-primary-600">
        <ClipboardPlus className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          New Order
        </h2>
      </div>
      <p className="-mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        For a phone-in or walk-in order — settled by cash or UPI, no Razorpay involved.
      </p>

      <ManualOrderForm />
    </div>
  );
}
