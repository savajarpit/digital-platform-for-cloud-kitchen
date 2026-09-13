-- AlterTable
ALTER TABLE "meals" ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "prepNotes" TEXT;

