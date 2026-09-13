-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'SEATED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderFulfillmentType" ADD VALUE 'DINE_IN';
ALTER TYPE "OrderFulfillmentType" ADD VALUE 'TAKEAWAY';

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "dineInKitchenZoneId" TEXT,
ADD COLUMN     "guestName" TEXT,
ADD COLUMN     "guestPhone" TEXT,
ADD COLUMN     "tableId" TEXT,
ADD COLUMN     "tableLabelSnapshot" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

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
CREATE INDEX "orders_tenantId_tableId_idx" ON "orders"("tenantId", "tableId");

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
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_dineInKitchenZoneId_fkey" FOREIGN KEY ("dineInKitchenZoneId") REFERENCES "kitchen_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "dining_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

