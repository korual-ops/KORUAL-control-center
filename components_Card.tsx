interface CardProps {
  label: string;
  value: string | number;
  sub?: string;
}

export default function Card({ label, value, sub }: CardProps) {
  return (
    <div
      className="
        bg-[var(--card-bg)]
        backdrop-blur-2xl
        border border-[var(--border)]
        rounded-2xl
        shadow-[0_18px_45px_var(--shadow)]
        p-4 md:p-5
        flex flex-col gap-1
      "
    >
      <div className="text-xs text-[var(--text-soft)] uppercase tracking-wide">
        {label}
      </div>
      <div className="text-2xl md:text-3xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-[var(--text-soft)]">{sub}</div>}
    </div>
  );
}
