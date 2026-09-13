-- CreateEnum
CREATE TYPE "OrderPaymentMethod" AS ENUM ('RAZORPAY', 'CASH', 'UPI');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "paymentMethod" "OrderPaymentMethod" NOT NULL DEFAULT 'RAZORPAY';

