import type { PublicPlanFeature } from "@/lib/api/plans";

export function WhySubscribeSection({ features }: { features: PublicPlanFeature[] }) {
  if (features.length === 0) return null;

  return (
    <section className="container-app py-16 sm:py-20">
      <h2 className="section-title text-center text-zinc-900 dark:text-zinc-100">
        Why subscribe?
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.id} className="card p-6 text-center">
            <div className="text-4xl">{feature.icon}</div>
            <h3 className="mt-3 font-bold text-zinc-900 dark:text-zinc-100">{feature.title}</h3>
            {feature.description && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{feature.description}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
