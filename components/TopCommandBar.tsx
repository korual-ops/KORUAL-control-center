export function TopCommandBar() {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-[1.35rem] border border-white/10 bg-black/35 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="signal-pill border-emerald-300/25 bg-emerald-300/10 text-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          Live
        </span>
        <span className="signal-pill border-korual-gold/20 bg-korual-gold/10 text-korual-champagne">
          Private margin mode
        </span>
        <span className="hidden rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 font-semibold text-korual-mist sm:inline-flex">
          Last sync 12:08 KST
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-korual-mist">
        <span>Seoul</span>
        <span className="h-1 w-1 rounded-full bg-korual-gold/60" />
        <span>API 24 ms</span>
        <button type="button" className="quiet-button px-3 py-2 text-xs">
          Refresh
        </button>
      </div>
    </div>
  );
}
