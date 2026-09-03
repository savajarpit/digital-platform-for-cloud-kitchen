-- CreateEnum
CREATE TYPE "EmailTemplateScope" AS ENUM ('PLATFORM_OPS', 'CUSTOMER_DEFAULT');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "poweredByBrandingEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "platform_email_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scope" "EmailTemplateScope" NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "availableVars" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_notification_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_whatsapp_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "placeholders" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_email_templates_key_key" ON "platform_email_templates"("key");

-- CreateIndex
CREATE INDEX "tenant_notification_templates_tenantId_idx" ON "tenant_notification_templates"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_notification_templates_tenantId_key_key" ON "tenant_notification_templates"("tenantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "platform_whatsapp_templates_key_key" ON "platform_whatsapp_templates"("key");

-- AddForeignKey
ALTER TABLE "tenant_notification_templates" ADD CONSTRAINT "tenant_notification_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
