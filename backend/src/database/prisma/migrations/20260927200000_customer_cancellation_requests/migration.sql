-- CreateEnum
CREATE TYPE "CancellationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "order_acceptance_settings" ADD COLUMN     "allowOrderCancelRequests" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "subscription_skips" ADD COLUMN     "cancellationRequestId" TEXT;

-- CreateTable
CREATE TABLE "customer_cancellation_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "orderId" TEXT,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "status" "CancellationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "heldFromDate" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "resolutionNote" TEXT,
    "bankedDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_cancellation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_cancellation_requests_tenantId_status_idx" ON "customer_cancellation_requests"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customer_cancellation_requests_subscriptionId_idx" ON "customer_cancellation_requests"("subscriptionId");

-- CreateIndex
CREATE INDEX "customer_cancellation_requests_orderId_idx" ON "customer_cancellation_requests"("orderId");

-- CreateIndex
CREATE INDEX "subscription_skips_cancellationRequestId_idx" ON "subscription_skips"("cancellationRequestId");

-- AddForeignKey
ALTER TABLE "subscription_skips" ADD CONSTRAINT "subscription_skips_cancellationRequestId_fkey" FOREIGN KEY ("cancellationRequestId") REFERENCES "customer_cancellation_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_cancellation_requests" ADD CONSTRAINT "customer_cancellation_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_cancellation_requests" ADD CONSTRAINT "customer_cancellation_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_cancellation_requests" ADD CONSTRAINT "customer_cancellation_requests_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_cancellation_requests" ADD CONSTRAINT "customer_cancellation_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

