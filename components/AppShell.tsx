import Link from "next/link";
import { brand, navItems } from "@/lib/brand";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-white/10 bg-black/25 p-5 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <Link href="/" className="block">
          <div className="text-xs font-semibold uppercase tracking-[0.36em] text-korual-gold">{brand.name}</div>
          <div className="mt-3 text-2xl font-semibold text-white">Control Center</div>
          <p className="mt-2 text-sm leading-6 text-korual-mist">{brand.positioning}</p>
        </Link>
        <nav className="mt-8 grid gap-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-xl border border-white/0 px-4 py-3 text-sm font-medium text-korual-mist transition hover:border-white/10 hover:bg-white/[0.06] hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 rounded-2xl border border-korual-gold/20 bg-korual-gold/10 p-4">
          <div className="text-sm font-semibold text-korual-champagne">{brand.manifesto}</div>
          <p className="mt-2 text-xs leading-5 text-korual-mist">Built for margin discipline, refined catalog operations, and AI-assisted commerce execution.</p>
        </div>
      </aside>
      <main className="min-w-0 p-5 sm:p-8">{children}</main>
    </div>
  );
}
