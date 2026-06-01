import Link from "next/link";
import { brand, navItems } from "@/lib/brand";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[304px_1fr]">
      <aside className="border-b border-white/10 bg-black/30 p-5 backdrop-blur-2xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <Link href="/" className="premium-panel block p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.42em] text-korual-gold">
              {brand.name}
            </div>
            <div className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.8)]" />
          </div>
          <div className="mt-5 text-2xl font-semibold tracking-tight text-white">Control Center</div>
          <p className="mt-3 text-sm leading-6 text-korual-mist">{brand.positioning}</p>
          <div className="gold-rule mt-5" />
          <div className="mt-4 text-[11px] uppercase tracking-[0.24em] text-korual-champagne/80">
            Private commerce command
          </div>
        </Link>
        <nav className="mt-6 grid gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center justify-between rounded-2xl border border-white/0 px-4 py-3 text-sm font-medium text-korual-mist transition hover:border-korual-gold/20 hover:bg-white/[0.06] hover:text-white"
            >
              <span>{item.label}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-korual-gold/0 transition group-hover:bg-korual-gold" />
            </Link>
          ))}
        </nav>
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
      </aside>
      <main className="min-w-0 p-5 sm:p-8 xl:p-10">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
