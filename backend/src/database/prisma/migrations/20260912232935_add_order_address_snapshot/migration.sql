-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "addressCitySnapshot" TEXT,
ADD COLUMN     "addressContactPhoneSnapshot" TEXT,
ADD COLUMN     "addressLatSnapshot" DOUBLE PRECISION,
ADD COLUMN     "addressLine1Snapshot" TEXT,
ADD COLUMN     "addressLine2Snapshot" TEXT,
ADD COLUMN     "addressLngSnapshot" DOUBLE PRECISION,
ADD COLUMN     "addressPincodeSnapshot" TEXT,
ADD COLUMN     "addressStateSnapshot" TEXT;

