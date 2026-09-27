-- CreateEnum
CREATE TYPE "SubscriptionPlanViewMode" AS ENUM ('ACCORDION', 'CALENDAR', 'BOTH');

-- AlterTable
ALTER TABLE "subscription_settings" ADD COLUMN     "allowDateChangeAfterPurchase" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dateSelectionEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "planViewMode" "SubscriptionPlanViewMode" NOT NULL DEFAULT 'ACCORDION',
ADD COLUMN     "selectionFlexibilityDays" INTEGER NOT NULL DEFAULT 7;
