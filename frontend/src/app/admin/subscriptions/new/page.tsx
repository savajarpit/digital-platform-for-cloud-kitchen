"use client";

import Link from "next/link";
import { ArrowLeft, ClipboardPlus } from "lucide-react";
import { ManualSubscriptionForm } from "@/components/admin/ManualSubscriptionForm";

export default function NewManualSubscriptionPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/subscriptions"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-primary-600 dark:text-zinc-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to subscriptions
      </Link>

      <div className="flex items-center gap-2 text-primary-600">
        <ClipboardPlus className="h-5 w-5" />
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
          New Subscription
        </h2>
      </div>
      <p className="-mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        For a phone-in or walk-in signup — settled by cash or UPI, no Razorpay involved.
      </p>

      <ManualSubscriptionForm />
    </div>
  );
}
