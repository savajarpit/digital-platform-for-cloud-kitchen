-- CreateEnum
CREATE TYPE "BrandDisplayMode" AS ENUM ('LOGO', 'NAME', 'BOTH');

-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "headerDisplayMode" "BrandDisplayMode" NOT NULL DEFAULT 'BOTH',
ADD COLUMN     "footerDisplayMode" "BrandDisplayMode" NOT NULL DEFAULT 'BOTH',
ADD COLUMN     "headerLogoHeightPx" INTEGER NOT NULL DEFAULT 36,
ADD COLUMN     "headerLogoWidthPx" INTEGER,
ADD COLUMN     "footerLogoHeightPx" INTEGER NOT NULL DEFAULT 36,
ADD COLUMN     "footerLogoWidthPx" INTEGER,
ADD COLUMN     "ogImageUrl" TEXT,
ADD COLUMN     "ogImageAlt" TEXT,
ADD COLUMN     "ogImageWidth" INTEGER,
ADD COLUMN     "ogImageHeight" INTEGER;
