import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

/** Shown from the instant Razorpay reports a successful payment until the
 * redirect to the order page commits. Without it the checkout page paints
 * a blank frame in that gap — the cart has just been cleared (so the page
 * renders `null`) while `verifyPayment` + the route transition are still
 * in flight. Reassures the customer the charge went through and something
 * is happening. */
export function PaymentConfirmingScreen() {
  const t = useTranslations("checkout");

  return (
    <main className="container-app flex flex-1 flex-col items-center justify-center py-24">
      <div className="card flex w-full max-w-sm flex-col items-center gap-4 p-10 text-center">
        <div className="animate-scale-in relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-primary-100 dark:bg-primary-950" />
          <CheckCircle2 className="relative h-10 w-10 text-primary-600" />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {t("paymentReceived")}
          </h1>
          <p className="mt-1 flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("settingUpOrder")}
          </p>
        </div>
      </div>
    </main>
  );
}
