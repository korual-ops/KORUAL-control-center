export function StatusPill({ value }: { value: string }) {
  const tone =
    value === "Online" || value === "Live" || value === "Ready" || value === "Premium"
      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
      : value === "Watch" || value === "High"
        ? "border-amber-300/20 bg-amber-300/10 text-amber-200"
        : "border-white/10 bg-white/[0.06] text-korual-mist";

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{value}</span>;
}
