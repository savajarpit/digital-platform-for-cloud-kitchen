Loaded Prisma config from prisma.config.ts.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "static_pages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "static_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_terms" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_terms_acceptances" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "platform_terms_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "static_pages_tenantId_idx" ON "static_pages"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "static_pages_tenantId_slug_key" ON "static_pages"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "platform_terms_version_key" ON "platform_terms"("version");

-- CreateIndex
CREATE INDEX "platform_terms_acceptances_tenantId_idx" ON "platform_terms_acceptances"("tenantId");

-- CreateIndex
CREATE INDEX "platform_terms_acceptances_userId_idx" ON "platform_terms_acceptances"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_terms_acceptances_tenantId_userId_version_key" ON "platform_terms_acceptances"("tenantId", "userId", "version");

-- AddForeignKey
ALTER TABLE "static_pages" ADD CONSTRAINT "static_pages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_terms_acceptances" ADD CONSTRAINT "platform_terms_acceptances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_terms_acceptances" ADD CONSTRAINT "platform_terms_acceptances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

