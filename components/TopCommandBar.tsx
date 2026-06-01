export function TopCommandBar() {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-[1.35rem] border border-white/10 bg-black/20 p-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 font-semibold text-emerald-200">
          Live operating layer
        </span>
        <span className="rounded-full border border-korual-gold/20 bg-korual-gold/10 px-3 py-1.5 font-semibold text-korual-champagne">
          Private margin mode
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-korual-mist">
        <span>Seoul</span>
        <span className="h-1 w-1 rounded-full bg-korual-gold/60" />
        <span>Quiet Luxury AI Commerce OS</span>
      </div>
    </div>
  );
}
