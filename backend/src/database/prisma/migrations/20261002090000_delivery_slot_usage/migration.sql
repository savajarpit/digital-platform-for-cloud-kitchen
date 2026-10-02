-- Which flows a delivery slot is offered in (orders, subscriptions or both).
-- Every existing slot becomes BOTH, so nothing changes until an owner edits it.
CREATE TYPE "DeliverySlotUsage" AS ENUM ('ORDERS', 'SUBSCRIPTIONS', 'BOTH');

ALTER TABLE "delivery_slots" ADD COLUMN     "usage" "DeliverySlotUsage" NOT NULL DEFAULT 'BOTH';
