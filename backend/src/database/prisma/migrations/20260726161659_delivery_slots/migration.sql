-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "maxAdvanceOrderDays" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "requestedDeliveryTime",
ADD COLUMN     "deliveryDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "deliverySlotId" TEXT,
ADD COLUMN     "deliverySlotName" TEXT NOT NULL,
ADD COLUMN     "deliveryWindowEnd" TEXT NOT NULL,
ADD COLUMN     "deliveryWindowStart" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "delivery_slots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_slots_tenantId_idx" ON "delivery_slots"("tenantId");

-- AddForeignKey
ALTER TABLE "delivery_slots" ADD CONSTRAINT "delivery_slots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_deliverySlotId_fkey" FOREIGN KEY ("deliverySlotId") REFERENCES "delivery_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

