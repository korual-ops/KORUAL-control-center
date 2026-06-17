"use client";

import { useState } from "react";

function formatSyncTime(date: Date) {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function TopCommandBar() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState(() => formatSyncTime(new Date()));

  function refreshOperatingLayer() {
    setIsRefreshing(true);
    window.setTimeout(() => {
      setLastSync(formatSyncTime(new Date()));
      setIsRefreshing(false);
      setToast("KORUAL operating layer refreshed.");
      window.setTimeout(() => setToast(null), 2400);
    }, 650);
  }

  return (
    <>
      {isRefreshing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-korual-black/70 backdrop-blur-sm">
          <div className="rounded-2xl border border-korual-gold/25 bg-black/80 px-6 py-5 text-center shadow-glass">
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-white/10 border-t-korual-gold animate-spin" />
            <div className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-korual-champagne">
              Syncing KORUAL
            </div>
            <p className="mt-2 text-xs text-korual-mist">Refreshing dashboard, tables, and operating signals.</p>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
          <div className="rounded-full border border-emerald-300/25 bg-emerald-950/90 px-4 py-2 text-xs font-semibold text-emerald-100 shadow-glass">
            {toast}
          </div>
        </div>
      ) : null}

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
            Last sync {lastSync} KST
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-korual-mist">
          <span>Seoul</span>
          <span className="h-1 w-1 rounded-full bg-korual-gold/60" />
          <span>API 24 ms</span>
          <button type="button" className="quiet-button px-3 py-2 text-xs" onClick={refreshOperatingLayer}>
            Refresh
          </button>
        </div>
      </div>
    </>
  );
}
