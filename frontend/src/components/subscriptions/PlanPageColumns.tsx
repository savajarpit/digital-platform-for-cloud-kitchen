/** A plan page's two columns: the menu/calendar, and a rail that stays in
 * view while the page scrolls on desktop (checkout first, then day details).
 * Below `lg` the rail simply follows the main column. */
export function PlanPageColumns({
  main,
  rail,
}: {
  main: React.ReactNode;
  rail: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
      <div className="min-w-0">{main}</div>
      {/* No scroll box of its own: the long parts inside (meal list, "Your
          days") scroll by themselves, which keeps the rail screen-sized. */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        {rail}
      </div>
    </div>
  );
}
