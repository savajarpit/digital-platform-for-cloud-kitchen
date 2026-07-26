import { proxyFetch } from "@/lib/api/client";

export interface VerifyPaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export function verifyPayment(input: VerifyPaymentInput): Promise<{ confirmed: true }> {
  return proxyFetch<{ confirmed: true }>("/payments/verify", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
