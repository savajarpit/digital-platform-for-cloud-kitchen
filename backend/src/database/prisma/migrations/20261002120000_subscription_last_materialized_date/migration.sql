-- The tenant-local date a subscription was last materialized for; the hourly
-- job claims it atomically so a day is never materialized twice.
ALTER TABLE "subscriptions" ADD COLUMN     "lastMaterializedDate" TEXT;
