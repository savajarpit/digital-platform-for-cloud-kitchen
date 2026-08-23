import { getTranslations } from "next-intl/server";
import { getPublicConfig } from "@/lib/api/settings";
import { getPublicHomeSections } from "@/lib/api/home-sections";
import { getPublishedPlans, getPlansHomeSettings } from "@/lib/api/plans";
import { getPublicReviews } from "@/lib/api/reviews";
import { Hero } from "@/components/home/Hero";
import { HomeSectionsBlock } from "@/components/home/HomeSectionsBlock";
import { PlansHomeBlock } from "@/components/home/PlansHomeBlock";
import { ReviewsBlock } from "@/components/home/ReviewsBlock";
import { HomeCtaSection } from "@/components/home/HomeCtaSection";

export default async function Home() {
  const [config, t, sections, plans, plansHomeSettings, reviews] = await Promise.all([
    getPublicConfig(),
    getTranslations("home"),
    getPublicHomeSections(),
    getPublishedPlans(),
    getPlansHomeSettings(),
    getPublicReviews(),
  ]);
  const showPlansBlock =
    plansHomeSettings.isEnabled && plansHomeSettings.showOnHomepage && plans.length > 0;
  const showReviewsBlock = config.showReviewsOnHomepage && reviews.length > 0;
  const reviewAvg = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  return (
    <main className="flex flex-1 flex-col">
      <Hero
        config={config}
        heroCtaLabel={t("heroCta")}
        viewPlansLabel={t("viewPlans")}
        showPlansCta={plansHomeSettings.isEnabled}
        reviewAvg={reviewAvg}
        reviewCount={reviews.length}
      />

      <div className="bg-zinc-50 dark:bg-zinc-950">
        <HomeSectionsBlock sections={sections} currency={config.currency} />
        {showPlansBlock && (
          <PlansHomeBlock
            plans={plans}
            title={plansHomeSettings.homepageTitle}
            description={plansHomeSettings.homepageDescription}
          />
        )}
        {showReviewsBlock && (
          <ReviewsBlock
            reviews={reviews}
            title={config.reviewsSectionTitle}
            description={config.reviewsSectionDescription}
          />
        )}
        <HomeCtaSection config={config} />
      </div>
    </main>
  );
}
