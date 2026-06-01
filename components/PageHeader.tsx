export function PageHeader({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="premium-panel relative mb-7 overflow-hidden p-6 sm:p-8">
      <div className="absolute right-6 top-6 hidden rounded-full border border-korual-gold/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-korual-champagne/80 sm:block">
        KORUAL OS
      </div>
      <div className="label">{eyebrow}</div>
      <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        {title}
      </h1>
      <p className="mt-5 max-w-3xl text-base leading-7 text-korual-mist">{description}</p>
      <div className="gold-rule mt-7" />
    </header>
  );
}
