import { PUBLIC_API_URL } from "@/lib/config/env";
import { ApiError, parseOrThrow } from "@/lib/api/client";

export { ApiError };

export interface ActivationInvite {
  businessName: string;
  planCode: string;
  billingCycle: "MONTHLY" | "YEARLY";
  amountInPaise: number;
  razorpaySubscriptionId: string;
  razorpayKeyId: string;
  trialEndsAt: string | null;
}

export interface VerifyActivationInput {
  razorpayPaymentId: string;
  razorpaySubscriptionId: string;
  razorpaySignature: string;
}

/** Public, unauthenticated — no tenant context needed (this describes the platform, not any tenant's own domain). */
export async function getActivationInvite(token: string): Promise<ActivationInvite> {
  const res = await fetch(`${PUBLIC_API_URL}/platform/activate/${token}`);
  return parseOrThrow<ActivationInvite>(res);
}

export async function verifyActivation(
  token: string,
  input: VerifyActivationInput,
): Promise<{ activated: true }> {
  const res = await fetch(`${PUBLIC_API_URL}/platform/activate/${token}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseOrThrow<{ activated: true }>(res);
}
