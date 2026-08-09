import type { PublicHomeSection } from "@/lib/api/home-sections";
import { MealCard } from "@/components/menu/MealCard";

export function HomeSectionsBlock({
  sections,
  currency,
}: {
  sections: PublicHomeSection[];
  currency: string;
}) {
  return (
    <>
      {sections.map((section) => (
        <section key={section.id} className="container-app py-16 sm:py-20">
          <h2 className="section-title text-zinc-900 dark:text-zinc-100">{section.title}</h2>
          {section.description && (
            <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">{section.description}</p>
          )}
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {section.items.map((item, index) => (
              <MealCard key={item.id} meal={item.meal} currency={currency} index={index} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
