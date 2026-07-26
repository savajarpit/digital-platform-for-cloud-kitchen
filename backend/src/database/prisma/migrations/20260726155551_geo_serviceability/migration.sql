-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "deliveryFee" INTEGER,
ADD COLUMN     "deliveryRadiusMeters" INTEGER,
ADD COLUMN     "freeDeliveryAboveAmount" INTEGER,
ADD COLUMN     "kitchenLat" DOUBLE PRECISION,
ADD COLUMN     "kitchenLng" DOUBLE PRECISION,
ADD COLUMN     "minOrderAmount" INTEGER;

