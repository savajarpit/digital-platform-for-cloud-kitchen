-- CreateEnum
CREATE TYPE "MapsProvider" AS ENUM ('OSM', 'GOOGLE');

-- AlterTable
ALTER TABLE "platform_settings" ADD COLUMN     "mapsProvider" "MapsProvider" NOT NULL DEFAULT 'OSM',
ADD COLUMN     "googleMapsApiKeyEncrypted" TEXT;
