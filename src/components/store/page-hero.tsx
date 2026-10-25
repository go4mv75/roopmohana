export function PageHero({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string | null }) {
  return (
    <section className="bg-ivory border-b border-line">
      <div className="container-x py-14 sm:py-20 text-center">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display text-5xl sm:text-6xl mt-4">{title}</h1>
        {description && <p className="text-muted mt-4 max-w-lg mx-auto">{description}</p>}
      </div>
    </section>
  );
}
