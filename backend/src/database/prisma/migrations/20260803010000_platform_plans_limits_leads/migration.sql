-- CreateEnum
CREATE TYPE "PlatformLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'DISMISSED');

-- AlterTable
ALTER TABLE "platform_subscriptions" ADD COLUMN     "planId" TEXT;

-- CreateTable
CREATE TABLE "platform_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceInPaise" INTEGER NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "defaultMaxOrdersPerMonth" INTEGER NOT NULL,
    "defaultMaxSubscribers" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_limits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "maxOrdersOverride" INTEGER,
    "maxSubscribersOverride" INTEGER,
    "blockedOrderAttempts" INTEGER NOT NULL DEFAULT 0,
    "blockedOrderAttemptsMonth" TEXT,
    "nearOrderLimitAlertedMonth" TEXT,
    "orderLimitHitAlertedMonth" TEXT,
    "blockedSubscriberAttempts" INTEGER NOT NULL DEFAULT 0,
    "nearSubscriberLimitAlerted" BOOLEAN NOT NULL DEFAULT false,
    "subscriberLimitHitAlerted" BOOLEAN NOT NULL DEFAULT false,
    "signupLimitEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxSignupsPerMonth" INTEGER,
    "blockedSignupAttempts" INTEGER NOT NULL DEFAULT 0,
    "blockedSignupAttemptsMonth" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_leads" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "planId" TEXT,
    "message" TEXT,
    "tenantId" TEXT,
    "status" "PlatformLeadStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_limits_tenantId_key" ON "tenant_limits"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_limits_tenantId_idx" ON "tenant_limits"("tenantId");

-- CreateIndex
CREATE INDEX "platform_leads_tenantId_idx" ON "platform_leads"("tenantId");

-- CreateIndex
CREATE INDEX "platform_leads_status_idx" ON "platform_leads"("status");

-- CreateIndex
CREATE INDEX "platform_subscriptions_planId_idx" ON "platform_subscriptions"("planId");

-- AddForeignKey
ALTER TABLE "platform_subscriptions" ADD CONSTRAINT "platform_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "platform_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_limits" ADD CONSTRAINT "tenant_limits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_leads" ADD CONSTRAINT "platform_leads_planId_fkey" FOREIGN KEY ("planId") REFERENCES "platform_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_leads" ADD CONSTRAINT "platform_leads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
