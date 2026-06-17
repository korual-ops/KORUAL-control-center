import Link from "next/link";
import { brand } from "@/lib/brand";
import { SideNav } from "@/components/SideNav";
import { TopCommandBar } from "@/components/TopCommandBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[304px_1fr]">
      <aside className="border-b border-white/10 bg-black/40 p-5 backdrop-blur-2xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <Link href="/" className="premium-panel block p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-korual-pearl text-xl font-black text-korual-black shadow-gold">
              K
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.42em] text-korual-gold">
                {brand.name}
              </div>
              <div className="mt-1 text-xs text-korual-mist">Control Center</div>
            </div>
            <div className="ml-auto h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.8)]" />
          </div>
          <div className="mt-5 text-2xl font-semibold tracking-tight text-white">Executive operations layer</div>
          <p className="mt-3 text-sm leading-6 text-korual-mist">{brand.positioning}</p>
          <div className="gold-rule mt-5" />
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2">
            <span className="text-[11px] uppercase tracking-[0.24em] text-korual-champagne/80">
              Private command
            </span>
            <span className="rounded-full border border-emerald-300/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
              LIVE
            </span>
          </div>
        </Link>
        <SideNav />
        <div className="mt-6 rounded-[1.35rem] border border-korual-gold/20 bg-korual-gold/10 p-5">
          <div className="text-sm font-semibold text-korual-champagne">{brand.manifesto}</div>
          <p className="mt-2 text-xs leading-5 text-korual-mist">
            Margin discipline, refined catalog operations, and AI-assisted commerce execution in one quiet surface.
          </p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <div className="text-korual-mist">Mode</div>
            <div className="mt-2 font-semibold text-white">Operator</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <div className="text-korual-mist">Status</div>
            <div className="mt-2 font-semibold text-emerald-300">Live</div>
          </div>
        </div>
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-korual-mist">API status</span>
            <span className="flex items-center gap-2 font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Connected
            </span>
          </div>
          <div className="mt-3 text-korual-mist">Ping <span className="text-white">24 ms</span></div>
        </div>
      </aside>
      <main className="min-w-0 p-5 sm:p-8 xl:p-10">
        <div className="mx-auto max-w-7xl">
          <TopCommandBar />
          {children}
        </div>
      </main>
    </div>
  );
}
