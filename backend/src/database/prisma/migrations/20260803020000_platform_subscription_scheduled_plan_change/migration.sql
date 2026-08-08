-- AlterTable
ALTER TABLE "platform_subscriptions" ADD COLUMN     "scheduledPlanChangeAt" TIMESTAMP(3),
ADD COLUMN     "scheduledPlanId" TEXT;

-- AddForeignKey
ALTER TABLE "platform_subscriptions" ADD CONSTRAINT "platform_subscriptions_scheduledPlanId_fkey" FOREIGN KEY ("scheduledPlanId") REFERENCES "platform_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
