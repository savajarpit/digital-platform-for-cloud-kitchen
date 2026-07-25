-- CreateEnum
CREATE TYPE "WhatsappProvider" AS ENUM ('INTERAKT', 'AISENSY', 'GUPSHUP', 'TWILIO');

-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('RESEND', 'SMTP');

-- AlterEnum
-- Remaps existing rows to their closest domain-role equivalent instead of
-- dropping them: ADMIN -> OWNER, USER -> CUSTOMER, GUEST -> CUSTOMER.
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'OWNER', 'STAFF', 'DELIVERY', 'CUSTOMER');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING (
  CASE "role"::text
    WHEN 'ADMIN' THEN 'OWNER'
    WHEN 'USER' THEN 'CUSTOMER'
    WHEN 'GUEST' THEN 'CUSTOMER'
    ELSE "role"::text
  END
)::"Role_new";
ALTER TABLE "role_permissions" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
COMMIT;

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "whatsappBusinessNumber" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "pincode" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "gstNumber" TEXT,
    "themeConfig" JSONB NOT NULL DEFAULT '{}',
    "defaultLocale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_acceptance_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "operatingHours" JSONB NOT NULL DEFAULT '{}',
    "dailyCutoffTime" TEXT,
    "closedDates" JSONB NOT NULL DEFAULT '[]',
    "isTemporarilyClosed" BOOLEAN NOT NULL DEFAULT false,
    "closureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_acceptance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serviceable_pincodes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    "minOrderAmount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serviceable_pincodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappProvider" "WhatsappProvider",
    "whatsappApiKeyEncrypted" TEXT,
    "whatsappConfigEncrypted" JSONB,
    "whatsappSenderNumber" TEXT,
    "ownerWhatsappNumber" TEXT,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailProvider" "EmailProvider",
    "emailFromAddress" TEXT,
    "emailFromName" TEXT,
    "emailConfigEncrypted" JSONB,
    "ownerNotificationEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "razorpayKeyId" TEXT,
    "razorpayKeySecretEncrypted" TEXT,
    "razorpayWebhookSecretEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permissionId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_tenantId_key" ON "business_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "business_profiles_tenantId_idx" ON "business_profiles"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "order_acceptance_settings_tenantId_key" ON "order_acceptance_settings"("tenantId");

-- CreateIndex
CREATE INDEX "order_acceptance_settings_tenantId_idx" ON "order_acceptance_settings"("tenantId");

-- CreateIndex
CREATE INDEX "serviceable_pincodes_tenantId_idx" ON "serviceable_pincodes"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "serviceable_pincodes_tenantId_pincode_key" ON "serviceable_pincodes"("tenantId", "pincode");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_tenantId_key" ON "notification_settings"("tenantId");

-- CreateIndex
CREATE INDEX "notification_settings_tenantId_idx" ON "notification_settings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_settings_tenantId_key" ON "payment_settings"("tenantId");

-- CreateIndex
CREATE INDEX "payment_settings_tenantId_idx" ON "payment_settings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "role_permissions_tenantId_idx" ON "role_permissions"("tenantId");

-- CreateIndex
CREATE INDEX "role_permissions_tenantId_role_idx" ON "role_permissions"("tenantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_tenantId_role_permissionId_key" ON "role_permissions"("tenantId", "role", "permissionId");

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_acceptance_settings" ADD CONSTRAINT "order_acceptance_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serviceable_pincodes" ADD CONSTRAINT "serviceable_pincodes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_settings" ADD CONSTRAINT "payment_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
