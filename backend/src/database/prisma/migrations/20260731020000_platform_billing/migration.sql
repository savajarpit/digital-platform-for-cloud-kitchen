Loaded Prisma config from prisma.config.ts.

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PlatformSubscriptionStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlatformInvoiceStatus" AS ENUM ('PAID', 'FAILED');

-- CreateTable
CREATE TABLE "platform_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "amountInPaise" INTEGER NOT NULL,
    "status" "PlatformSubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "razorpaySubscriptionId" TEXT,
    "razorpayCustomerId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_activation_invites" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "amountInPaise" INTEGER NOT NULL,
    "razorpaySubscriptionId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_activation_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "platformSubscriptionId" TEXT NOT NULL,
    "razorpayInvoiceId" TEXT,
    "razorpayPaymentId" TEXT,
    "amountInPaise" INTEGER NOT NULL,
    "status" "PlatformInvoiceStatus" NOT NULL,
    "invoiceUrl" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_subscriptions_tenantId_key" ON "platform_subscriptions"("tenantId");

-- CreateIndex
CREATE INDEX "platform_subscriptions_tenantId_idx" ON "platform_subscriptions"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_activation_invites_token_key" ON "tenant_activation_invites"("token");

-- CreateIndex
CREATE INDEX "tenant_activation_invites_tenantId_idx" ON "tenant_activation_invites"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_activation_invites_token_idx" ON "tenant_activation_invites"("token");

-- CreateIndex
CREATE INDEX "platform_invoices_tenantId_idx" ON "platform_invoices"("tenantId");

-- CreateIndex
CREATE INDEX "platform_invoices_platformSubscriptionId_idx" ON "platform_invoices"("platformSubscriptionId");

-- AddForeignKey
ALTER TABLE "platform_subscriptions" ADD CONSTRAINT "platform_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_activation_invites" ADD CONSTRAINT "tenant_activation_invites_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_invoices" ADD CONSTRAINT "platform_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_invoices" ADD CONSTRAINT "platform_invoices_platformSubscriptionId_fkey" FOREIGN KEY ("platformSubscriptionId") REFERENCES "platform_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

