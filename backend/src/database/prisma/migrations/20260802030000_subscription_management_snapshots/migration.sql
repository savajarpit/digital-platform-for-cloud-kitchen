-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "subscriptionId" TEXT;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "bonusDaysGranted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "couponCode" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

