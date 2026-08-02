-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "isInstant" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "instant_delivery_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "etaMinMinutes" INTEGER NOT NULL DEFAULT 30,
    "etaMaxMinutes" INTEGER NOT NULL DEFAULT 45,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instant_delivery_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instant_delivery_settings_tenantId_key" ON "instant_delivery_settings"("tenantId");

-- CreateIndex
CREATE INDEX "instant_delivery_settings_tenantId_idx" ON "instant_delivery_settings"("tenantId");

-- AddForeignKey
ALTER TABLE "instant_delivery_settings" ADD CONSTRAINT "instant_delivery_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
