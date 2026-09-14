-- CreateEnum
CREATE TYPE "OrderFulfillmentType" AS ENUM ('DELIVERY', 'PICKUP', 'DINE_IN', 'TAKEAWAY');

-- CreateEnum
CREATE TYPE "MealWeightUnit" AS ENUM ('G', 'KG');

-- CreateEnum
CREATE TYPE "SubscriptionPlanSchedulingMode" AS ENUM ('RELATIVE_DAY', 'WEEKLY_FIXED');

-- CreateEnum
CREATE TYPE "SubscriptionOffDayHandling" AS ENUM ('LOSS_DELIVERY', 'EXTEND_TO_COMPENSATE');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'SEATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlatformCancellationRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'RESOLVED');

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_addressId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "fssaiLicenseNumber" TEXT,
ADD COLUMN     "pickupEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "searchConsoleVerification" TEXT,
ADD COLUMN     "showFssaiLicense" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "meals" ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "weightUnit" "MealWeightUnit",
ADD COLUMN     "weightValue" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "dineInKitchenZoneId" TEXT,
ADD COLUMN     "fulfillmentType" "OrderFulfillmentType" NOT NULL DEFAULT 'DELIVERY',
ADD COLUMN     "guestName" TEXT,
ADD COLUMN     "guestPhone" TEXT,
ADD COLUMN     "pickupKitchenZoneId" TEXT,
ADD COLUMN     "prepNotes" TEXT,
ADD COLUMN     "tableId" TEXT,
ADD COLUMN     "tableLabelSnapshot" TEXT,
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "addressId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "platform_subscriptions" ADD COLUMN     "pendingRazorpaySubscriptionId" TEXT,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "razorpay_webhook_events" ADD COLUMN     "payload" JSONB;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "role" TEXT;

-- AlterTable
ALTER TABLE "subscription_day_overrides" ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "subscription_plan_days" ADD COLUMN     "weekNumber" INTEGER,
ADD COLUMN     "weekday" INTEGER,
ALTER COLUMN "dayNumber" DROP NOT NULL;

-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "offDayHandling" "SubscriptionOffDayHandling" NOT NULL DEFAULT 'LOSS_DELIVERY',
ADD COLUMN     "scheduleAnchorDate" TEXT,
ADD COLUMN     "schedulingMode" "SubscriptionPlanSchedulingMode" NOT NULL DEFAULT 'RELATIVE_DAY',
ADD COLUMN     "weekCount" INTEGER;

-- AlterTable
ALTER TABLE "subscription_settings" ADD COLUMN     "contactCtaDescription" TEXT,
ADD COLUMN     "contactCtaEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "contactCtaTitle" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "faqEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "homepageDescription" TEXT,
ADD COLUMN     "homepageTitle" TEXT,
ADD COLUMN     "isEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "plansPageSubtitle" TEXT,
ADD COLUMN     "plansPageTitle" TEXT,
ADD COLUMN     "startDateLeadDays" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "whySubscribeEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "subscription_skips" ADD COLUMN     "disruptionId" TEXT,
ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "tenant_activation_invites" ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "kitchen_zones" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    "minOrderAmount" INTEGER NOT NULL DEFAULT 0,
    "freeDeliveryAboveAmount" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pickupAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dining_tables" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kitchenZoneId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dining_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kitchenZoneId" TEXT NOT NULL,
    "guestName" TEXT,
    "guestPhone" TEXT,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "seatedOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seatedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addon_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minSelections" INTEGER NOT NULL DEFAULT 0,
    "maxSelections" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addon_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addon_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "addonGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceInPaise" INTEGER NOT NULL,
    "maxQuantityPerOrder" INTEGER NOT NULL DEFAULT 1,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addon_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_addon_groups" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "addonGroupId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_addon_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_page_content" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "heroTagline" TEXT,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "heroImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reviewsSectionTitle" TEXT,
    "reviewsSectionDescription" TEXT,
    "ctaEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ctaTitle" TEXT,
    "ctaDescription" TEXT,
    "ctaPrimaryLabel" TEXT,
    "ctaPrimaryLink" TEXT,
    "ctaSecondaryLabel" TEXT,
    "ctaSecondaryLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_page_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_features" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_faqs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_addons" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "addonItemId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "priceInPaiseSnapshot" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_item_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_disruptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT,
    "date" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "compensationDays" INTEGER NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_disruptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_cancellation_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "PlatformCancellationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_cancellation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kitchen_zones_tenantId_idx" ON "kitchen_zones"("tenantId");

-- CreateIndex
CREATE INDEX "dining_tables_tenantId_idx" ON "dining_tables"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "dining_tables_kitchenZoneId_label_key" ON "dining_tables"("kitchenZoneId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_seatedOrderId_key" ON "waitlist_entries"("seatedOrderId");

-- CreateIndex
CREATE INDEX "waitlist_entries_tenantId_idx" ON "waitlist_entries"("tenantId");

-- CreateIndex
CREATE INDEX "waitlist_entries_tenantId_kitchenZoneId_status_idx" ON "waitlist_entries"("tenantId", "kitchenZoneId", "status");

-- CreateIndex
CREATE INDEX "addon_groups_tenantId_idx" ON "addon_groups"("tenantId");

-- CreateIndex
CREATE INDEX "addon_items_tenantId_idx" ON "addon_items"("tenantId");

-- CreateIndex
CREATE INDEX "addon_items_addonGroupId_idx" ON "addon_items"("addonGroupId");

-- CreateIndex
CREATE INDEX "meal_addon_groups_mealId_idx" ON "meal_addon_groups"("mealId");

-- CreateIndex
CREATE INDEX "meal_addon_groups_addonGroupId_idx" ON "meal_addon_groups"("addonGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "meal_addon_groups_mealId_addonGroupId_key" ON "meal_addon_groups"("mealId", "addonGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "home_page_content_tenantId_key" ON "home_page_content"("tenantId");

-- CreateIndex
CREATE INDEX "home_page_content_tenantId_idx" ON "home_page_content"("tenantId");

-- CreateIndex
CREATE INDEX "plan_features_tenantId_idx" ON "plan_features"("tenantId");

-- CreateIndex
CREATE INDEX "plan_features_tenantId_isEnabled_idx" ON "plan_features"("tenantId", "isEnabled");

-- CreateIndex
CREATE INDEX "plan_faqs_tenantId_idx" ON "plan_faqs"("tenantId");

-- CreateIndex
CREATE INDEX "plan_faqs_tenantId_isPublished_idx" ON "plan_faqs"("tenantId", "isPublished");

-- CreateIndex
CREATE INDEX "order_item_addons_orderItemId_idx" ON "order_item_addons"("orderItemId");

-- CreateIndex
CREATE INDEX "subscription_disruptions_tenantId_idx" ON "subscription_disruptions"("tenantId");

-- CreateIndex
CREATE INDEX "subscription_disruptions_tenantId_planId_idx" ON "subscription_disruptions"("tenantId", "planId");

-- CreateIndex
CREATE INDEX "platform_cancellation_requests_tenantId_idx" ON "platform_cancellation_requests"("tenantId");

-- CreateIndex
CREATE INDEX "platform_cancellation_requests_status_idx" ON "platform_cancellation_requests"("status");

-- CreateIndex
CREATE INDEX "orders_tenantId_tableId_idx" ON "orders"("tenantId", "tableId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_invoices_razorpayPaymentId_key" ON "platform_invoices"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_days_planId_weekNumber_weekday_key" ON "subscription_plan_days"("planId", "weekNumber", "weekday");

-- CreateIndex
CREATE INDEX "subscription_skips_disruptionId_idx" ON "subscription_skips"("disruptionId");

-- AddForeignKey
ALTER TABLE "kitchen_zones" ADD CONSTRAINT "kitchen_zones_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_tables" ADD CONSTRAINT "dining_tables_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_tables" ADD CONSTRAINT "dining_tables_kitchenZoneId_fkey" FOREIGN KEY ("kitchenZoneId") REFERENCES "kitchen_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_kitchenZoneId_fkey" FOREIGN KEY ("kitchenZoneId") REFERENCES "kitchen_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_seatedOrderId_fkey" FOREIGN KEY ("seatedOrderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addon_groups" ADD CONSTRAINT "addon_groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addon_items" ADD CONSTRAINT "addon_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addon_items" ADD CONSTRAINT "addon_items_addonGroupId_fkey" FOREIGN KEY ("addonGroupId") REFERENCES "addon_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_addon_groups" ADD CONSTRAINT "meal_addon_groups_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_addon_groups" ADD CONSTRAINT "meal_addon_groups_addonGroupId_fkey" FOREIGN KEY ("addonGroupId") REFERENCES "addon_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_page_content" ADD CONSTRAINT "home_page_content_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_faqs" ADD CONSTRAINT "plan_faqs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_pickupKitchenZoneId_fkey" FOREIGN KEY ("pickupKitchenZoneId") REFERENCES "kitchen_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_dineInKitchenZoneId_fkey" FOREIGN KEY ("dineInKitchenZoneId") REFERENCES "kitchen_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "dining_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_addons" ADD CONSTRAINT "order_item_addons_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_addons" ADD CONSTRAINT "order_item_addons_addonItemId_fkey" FOREIGN KEY ("addonItemId") REFERENCES "addon_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_skips" ADD CONSTRAINT "subscription_skips_disruptionId_fkey" FOREIGN KEY ("disruptionId") REFERENCES "subscription_disruptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_disruptions" ADD CONSTRAINT "subscription_disruptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_disruptions" ADD CONSTRAINT "subscription_disruptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_cancellation_requests" ADD CONSTRAINT "platform_cancellation_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
