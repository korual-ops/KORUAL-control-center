export function MetricCard({
  label,
  value,
  detail,
  tone = "neutral"
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "gold" | "green" | "red";
}) {
  const toneClass = {
    neutral: "text-white",
    gold: "text-korual-champagne",
    green: "text-emerald-300",
    red: "text-rose-300"
  }[tone];

  return (
    <section className="glass-card metric-card group p-5">
      <div className="absolute right-5 top-5 h-8 w-8 rounded-full border border-korual-gold/20 bg-korual-gold/5" />
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-korual-mist">{label}</div>
      <div className={`mt-4 text-3xl font-semibold tracking-tight ${toneClass}`}>{value}</div>
      <div className="mt-3 text-sm leading-6 text-korual-mist">{detail}</div>
    </section>
  );
}
