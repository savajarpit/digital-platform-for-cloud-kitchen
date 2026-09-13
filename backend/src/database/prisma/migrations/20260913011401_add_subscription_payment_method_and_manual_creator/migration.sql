-- RenameEnum: OrderPaymentMethod is now shared by Order and Subscription,
-- so it's renamed to the generic PaymentMethod. A rename preserves every
-- existing orders.paymentMethod value untouched — unlike a drop+recreate,
-- which would silently reset any non-default (CASH/UPI) row back to
-- RAZORPAY.
ALTER TYPE "OrderPaymentMethod" RENAME TO "PaymentMethod";

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'RAZORPAY';
