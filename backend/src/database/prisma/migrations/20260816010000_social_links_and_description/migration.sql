-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'LINKEDIN', 'TWITTER', 'WHATSAPP', 'PINTEREST');

-- CreateTable
CREATE TABLE "social_links" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_links_tenantId_idx" ON "social_links"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "social_links_tenantId_platform_key" ON "social_links"("tenantId", "platform");

-- AddForeignKey
ALTER TABLE "social_links" ADD CONSTRAINT "social_links_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

