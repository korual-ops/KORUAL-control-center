export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="mb-7">
      <div className="label">{eyebrow}</div>
      <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-korual-mist">{description}</p>
    </header>
  );
}
