export function MetricCard({ label, value, detail, tone = "neutral" }: { label: string; value: string; detail: string; tone?: "neutral" | "gold" | "green" | "red" }) {
  const toneClass = {
    neutral: "text-white",
    gold: "text-korual-champagne",
    green: "text-emerald-300",
    red: "text-rose-300"
  }[tone];

  return (
    <section className="glass-card p-5">
      <div className="text-sm text-korual-mist">{label}</div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight ${toneClass}`}>{value}</div>
      <div className="mt-2 text-sm text-korual-mist">{detail}</div>
    </section>
  );
}
