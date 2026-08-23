import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { getPublicConfig } from "@/lib/api/settings";
import {
  getPublishedPlans,
  getPlansHomeSettings,
  getPlanFeatures,
  getPlanFaqs,
} from "@/lib/api/plans";
import { PlansBrowser } from "@/components/subscriptions/PlansBrowser";
import { WhySubscribeSection } from "@/components/subscriptions/WhySubscribeSection";
import { PlanFaqSection } from "@/components/subscriptions/PlanFaqSection";
import { StillHaveQuestionsSection } from "@/components/subscriptions/StillHaveQuestionsSection";

export default async function PlansPage() {
  const [config, plans, pageSettings, features, faqs] = await Promise.all([
    getPublicConfig(),
    getPublishedPlans(),
    getPlansHomeSettings(),
    getPlanFeatures(),
    getPlanFaqs(),
  ]);

  if (!pageSettings.isEnabled) {
    redirect("/");
  }

  if (plans.length === 0) {
    return (
      <main className="flex-1 bg-linear-to-br from-primary-50 to-white py-16 text-center dark:from-primary-950 dark:to-zinc-950">
        <div className="container-app">
          <span className="badge mx-auto bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
            <CalendarClock className="h-3.5 w-3.5" />
            Coming soon
          </span>
          <h1 className="section-title mt-4 text-zinc-900 dark:text-zinc-100">
            {pageSettings.plansPageTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-600 dark:text-zinc-400">
            Weekly meal plans from {config.displayName} are on the way.
          </p>
          <Link href="/menu" className="btn-primary mt-10">
            Browse the full menu
          </Link>
        </div>
      </main>
    );
  }

  const showWhySubscribe = pageSettings.whySubscribeEnabled && features.length > 0;
  const showFaq = pageSettings.faqEnabled && faqs.length > 0;
  const contactEmail = pageSettings.contactEmail ?? config.supportEmail;

  return (
    <main className="flex-1">
      <div className="bg-linear-to-br from-primary-50 to-white py-12 dark:from-primary-950 dark:to-zinc-950">
        <div className="container-app text-center">
          <h1 className="section-title text-zinc-900 dark:text-zinc-100">
            {pageSettings.plansPageTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-zinc-600 dark:text-zinc-400">
            {pageSettings.plansPageSubtitle}
          </p>
        </div>
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-950">
        <div className="container-app py-12">
          <PlansBrowser initialPlans={plans} />
        </div>

        {showWhySubscribe && <WhySubscribeSection features={features} />}
        {showFaq && <PlanFaqSection faqs={faqs} />}
        {pageSettings.contactCtaEnabled && (
          <StillHaveQuestionsSection
            title={pageSettings.contactCtaTitle}
            description={pageSettings.contactCtaDescription}
            email={contactEmail}
          />
        )}
      </div>
    </main>
  );
}
