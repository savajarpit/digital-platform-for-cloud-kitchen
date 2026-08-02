import { ApiError, proxyFetch } from "@/lib/api/client";

export { ApiError };

export type CouponDiscountType = "PERCENTAGE" | "FLAT";
export type PromotionType =
  | "BOGO"
  | "FREE_ITEM_ON_MINIMUM"
  | "SCHEDULED_DISCOUNT"
  | "PLAN_BONUS_DAYS";
export type PromoAppliesTo = "ORDERS" | "PLANS" | "BOTH";

export interface Coupon {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmountInPaise: number;
  maxUsesTotal: number | null;
  maxUsesPerUser: number | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  appliesTo: PromoAppliesTo;
}

export interface CouponInput {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmountInPaise?: number;
  maxUsesTotal?: number;
  maxUsesPerUser?: number;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
  appliesTo?: PromoAppliesTo;
}

export function listCoupons(): Promise<Coupon[]> {
  return proxyFetch<Coupon[]>("/promotions/coupons");
}

export function createCoupon(input: CouponInput): Promise<Coupon> {
  return proxyFetch<Coupon>("/promotions/coupons", { method: "POST", body: JSON.stringify(input) });
}

export function updateCoupon(id: string, input: Partial<CouponInput>): Promise<Coupon> {
  return proxyFetch<Coupon>(`/promotions/coupons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCoupon(id: string): Promise<void> {
  return proxyFetch<void>(`/promotions/coupons/${id}`, { method: "DELETE" });
}

export interface Promotion {
  id: string;
  type: PromotionType;
  name: string;
  isActive: boolean;
  appliesTo: PromoAppliesTo;
  buyMealId: string | null;
  buyQuantity: number | null;
  getMealId: string | null;
  getQuantity: number | null;
  minOrderAmountInPaise: number | null;
  freeMealId: string | null;
  discountPercentage: number | null;
  daysOfWeek: number[];
  startTime: string | null;
  endTime: string | null;
  mealIds: string[];
  categoryIds: string[];
  storewide: boolean;
  planIds: string[];
  minCycleDays: number | null;
  bonusDays: number | null;
}

export interface PromotionInput {
  type: PromotionType;
  name: string;
  isActive?: boolean;
  appliesTo?: PromoAppliesTo;
  buyMealId?: string;
  buyQuantity?: number;
  getMealId?: string;
  getQuantity?: number;
  minOrderAmountInPaise?: number;
  freeMealId?: string;
  discountPercentage?: number;
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
  mealIds?: string[];
  categoryIds?: string[];
  storewide?: boolean;
  planIds?: string[];
  minCycleDays?: number;
  bonusDays?: number;
}

export function listPromotions(): Promise<Promotion[]> {
  return proxyFetch<Promotion[]>("/promotions");
}

export function createPromotion(input: PromotionInput): Promise<Promotion> {
  return proxyFetch<Promotion>("/promotions", { method: "POST", body: JSON.stringify(input) });
}

export function updatePromotion(id: string, input: Partial<PromotionInput>): Promise<Promotion> {
  return proxyFetch<Promotion>(`/promotions/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deletePromotion(id: string): Promise<void> {
  return proxyFetch<void>(`/promotions/${id}`, { method: "DELETE" });
}
