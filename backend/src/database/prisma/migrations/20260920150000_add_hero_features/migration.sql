-- AlterTable
ALTER TABLE "home_page_content" ADD COLUMN     "heroFeatures" JSONB NOT NULL DEFAULT '[{"icon": "truck", "label": "Free delivery"}, {"icon": "shield-check", "label": "Fresh guarantee"}, {"icon": "clock", "label": "Cancel anytime"}]';
