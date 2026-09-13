// Shared by admin-orders.ts and admin-subscriptions.ts — one Refund shape
// backs both a one-off order's and a subscription's cancel-refund action.

export type RefundMethod = "MANUAL" | "RAZORPAY";

export interface Refund {
  id: string;
  method: RefundMethod;
  amountInPaise: number;
  convenienceFeeInPaise: number;
  netRefundInPaise: number;
  razorpayRefundId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CancelRefundInput {
  method: RefundMethod;
  amountInPaise: number;
  convenienceFeeInPaise?: number;
  reason?: string;
  notes?: string;
}
