-- CreateEnum
CREATE TYPE "PlanAccentColor" AS ENUM ('PRIMARY', 'SECONDARY', 'ACCENT');

-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "accentColor" "PlanAccentColor" NOT NULL DEFAULT 'PRIMARY',
ADD COLUMN     "badgeText" TEXT,
ADD COLUMN     "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isPopular" BOOLEAN NOT NULL DEFAULT false;

