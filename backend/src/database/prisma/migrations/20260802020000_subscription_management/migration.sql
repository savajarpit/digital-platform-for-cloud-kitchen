-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "deliverySlotId" TEXT;

-- CreateTable
CREATE TABLE "subscription_day_overrides" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "addressId" TEXT,
    "deliverySlotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_day_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isAcceptingNewSubscriptions" BOOLEAN NOT NULL DEFAULT true,
    "closureReason" TEXT,
    "noticeHoursBeforeDelivery" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_day_overrides_subscriptionId_idx" ON "subscription_day_overrides"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_day_overrides_subscriptionId_date_key" ON "subscription_day_overrides"("subscriptionId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_settings_tenantId_key" ON "subscription_settings"("tenantId");

-- CreateIndex
CREATE INDEX "subscription_settings_tenantId_idx" ON "subscription_settings"("tenantId");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_deliverySlotId_fkey" FOREIGN KEY ("deliverySlotId") REFERENCES "delivery_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_day_overrides" ADD CONSTRAINT "subscription_day_overrides_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_day_overrides" ADD CONSTRAINT "subscription_day_overrides_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_day_overrides" ADD CONSTRAINT "subscription_day_overrides_deliverySlotId_fkey" FOREIGN KEY ("deliverySlotId") REFERENCES "delivery_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_settings" ADD CONSTRAINT "subscription_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

