interface RazorpayCheckoutResponse {
  razorpay_payment_id: string;
  /** Present for one-time order checkouts (order_id mode). */
  razorpay_order_id: string;
  /** Present for recurring subscription checkouts (subscription_id mode) instead of razorpay_order_id. */
  razorpay_subscription_id?: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount?: number;
  currency?: string;
  /** One-time order checkout (customer order payment). Mutually exclusive with subscription_id. */
  order_id?: string;
  /** Recurring subscription checkout (platform billing activation). Mutually exclusive with order_id. */
  subscription_id?: string;
  name: string;
  description?: string;
  handler: (response: RazorpayCheckoutResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

export {};
