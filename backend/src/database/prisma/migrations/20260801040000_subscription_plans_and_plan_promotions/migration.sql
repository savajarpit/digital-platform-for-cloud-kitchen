-- CreateEnum
CREATE TYPE "PromoAppliesTo" AS ENUM ('ORDERS', 'PLANS', 'BOTH');

-- CreateEnum
CREATE TYPE "SubscriptionPlanType" AS ENUM ('CURATED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MealSlotType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionInvoiceStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- AlterEnum
ALTER TYPE "PromotionType" ADD VALUE 'PLAN_BONUS_DAYS';

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "appliesTo" "PromoAppliesTo" NOT NULL DEFAULT 'ORDERS';

-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "appliesTo" "PromoAppliesTo" NOT NULL DEFAULT 'ORDERS',
ADD COLUMN     "bonusDays" INTEGER,
ADD COLUMN     "minCycleDays" INTEGER,
ADD COLUMN     "planIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "SubscriptionPlanType" NOT NULL DEFAULT 'CURATED',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationDays" INTEGER NOT NULL,
    "priceInPaise" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_days" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plan_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_slots" (
    "id" TEXT NOT NULL,
    "planDayId" TEXT NOT NULL,
    "slotType" "MealSlotType" NOT NULL,
    "mealId" TEXT,

    CONSTRAINT "subscription_plan_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "priceInPaiseSnapshot" INTEGER NOT NULL,
    "durationDaysSnapshot" INTEGER NOT NULL,
    "planNameSnapshot" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "cycleEnd" TIMESTAMP(3),
    "nextPlanDayNumber" INTEGER NOT NULL DEFAULT 1,
    "bankedDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_skips" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "dateFrom" TEXT NOT NULL,
    "dateTo" TEXT NOT NULL,
    "bankedDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_skips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "amountInPaise" INTEGER NOT NULL,
    "status" "SubscriptionInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "cycleStart" TIMESTAMP(3),
    "cycleEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_coupon_redemptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_plans_tenantId_idx" ON "subscription_plans"("tenantId");

-- CreateIndex
CREATE INDEX "subscription_plans_tenantId_isPublished_idx" ON "subscription_plans"("tenantId", "isPublished");

-- CreateIndex
CREATE INDEX "subscription_plan_days_planId_idx" ON "subscription_plan_days"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_days_planId_dayNumber_key" ON "subscription_plan_days"("planId", "dayNumber");

-- CreateIndex
CREATE INDEX "subscription_plan_slots_planDayId_idx" ON "subscription_plan_slots"("planDayId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_slots_planDayId_slotType_key" ON "subscription_plan_slots"("planDayId", "slotType");

-- CreateIndex
CREATE INDEX "subscriptions_tenantId_idx" ON "subscriptions"("tenantId");

-- CreateIndex
CREATE INDEX "subscriptions_tenantId_userId_idx" ON "subscriptions"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "subscriptions_tenantId_status_idx" ON "subscriptions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "subscription_skips_subscriptionId_idx" ON "subscription_skips"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_razorpayOrderId_key" ON "subscription_invoices"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "subscription_invoices_tenantId_idx" ON "subscription_invoices"("tenantId");

-- CreateIndex
CREATE INDEX "subscription_invoices_subscriptionId_idx" ON "subscription_invoices"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_coupon_redemptions_subscriptionId_key" ON "plan_coupon_redemptions"("subscriptionId");

-- CreateIndex
CREATE INDEX "plan_coupon_redemptions_tenantId_idx" ON "plan_coupon_redemptions"("tenantId");

-- CreateIndex
CREATE INDEX "plan_coupon_redemptions_couponId_userId_idx" ON "plan_coupon_redemptions"("couponId", "userId");

-- AddForeignKey
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_days" ADD CONSTRAINT "subscription_plan_days_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_slots" ADD CONSTRAINT "subscription_plan_slots_planDayId_fkey" FOREIGN KEY ("planDayId") REFERENCES "subscription_plan_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_slots" ADD CONSTRAINT "subscription_plan_slots_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_skips" ADD CONSTRAINT "subscription_skips_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_coupon_redemptions" ADD CONSTRAINT "plan_coupon_redemptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_coupon_redemptions" ADD CONSTRAINT "plan_coupon_redemptions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_coupon_redemptions" ADD CONSTRAINT "plan_coupon_redemptions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

