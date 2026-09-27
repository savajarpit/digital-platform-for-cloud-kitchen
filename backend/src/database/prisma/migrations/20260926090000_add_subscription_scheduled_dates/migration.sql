-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "usesDateSelection" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "subscription_scheduled_dates" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_scheduled_dates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_scheduled_dates_subscriptionId_idx" ON "subscription_scheduled_dates"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_scheduled_dates_subscriptionId_date_key" ON "subscription_scheduled_dates"("subscriptionId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_scheduled_dates_subscriptionId_sequence_key" ON "subscription_scheduled_dates"("subscriptionId", "sequence");

-- AddForeignKey
ALTER TABLE "subscription_scheduled_dates" ADD CONSTRAINT "subscription_scheduled_dates_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
