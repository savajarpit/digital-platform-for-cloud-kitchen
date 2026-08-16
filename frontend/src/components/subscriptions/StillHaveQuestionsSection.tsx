export function StillHaveQuestionsSection({
  title,
  description,
  email,
}: {
  title: string;
  description: string;
  email?: string;
}) {
  return (
    <section className="container-app py-16 sm:py-20">
      <div className="rounded-3xl bg-linear-to-br from-primary-600 to-primary-800 p-8 text-center text-white shadow-glow sm:p-12">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-primary-50 sm:text-base">{description}</p>
        {email && (
          <a
            href={`mailto:${email}`}
            className="mt-6 inline-block rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-soft transition hover:bg-primary-50"
          >
            {email}
          </a>
        )}
      </div>
    </section>
  );
}
