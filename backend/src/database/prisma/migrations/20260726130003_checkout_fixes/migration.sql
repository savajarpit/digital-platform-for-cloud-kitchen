
-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "contactPhone" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "requestedDeliveryTime" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "serviceable_pincodes" ADD COLUMN     "freeDeliveryAboveAmount" INTEGER;

