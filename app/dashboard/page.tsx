import { AppShell } from "@/components/AppShell";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { metrics, orders, productPipeline } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="KORUAL Command"
        title="Quiet luxury commerce, operated with AI discipline."
        description="Track revenue, net profit, order movement, product sourcing, and automation readiness from one premium control surface."
      />
      <section className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="premium-panel p-6">
          <div className="label">Executive brief</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            Today favors disciplined restock, not noisy expansion.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-korual-mist">
            Core towel demand remains healthy, ad spend is contained, and one supplier delay should be handled before the evening close.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-semibold text-emerald-200">Margin floor protected</span>
            <span className="rounded-full border border-korual-gold/20 bg-korual-gold/10 px-4 py-2 text-xs font-semibold text-korual-champagne">3 AI drafts ready</span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-korual-mist">1 supplier risk</span>
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="label">Automation health</div>
          <div className="mt-5 text-5xl font-semibold text-korual-champagne">82%</div>
          <p className="mt-4 text-sm leading-6 text-korual-mist">Listing prompts, support templates, and margin guardrails are ready for connected data.</p>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-card p-6">
          <div className="label">Product pipeline</div>
          <div className="mt-5 grid gap-3">
            {productPipeline.map((product) => (
              <div key={product.name} className="grid gap-2 rounded-2xl border border-white/10 bg-black/25 p-4 md:grid-cols-[1fr_auto_auto]">
                <div>
                  <div className="font-semibold text-white">{product.name}</div>
                  <div className="text-sm text-korual-mist">{product.source}</div>
                </div>
                <div className="text-sm text-korual-champagne">{product.stage}</div>
                <div className="text-sm font-semibold text-emerald-300">{product.margin}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="glass-card p-6">
          <div className="label">Order status</div>
          <div className="mt-5 grid gap-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-white">{order.id}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-korual-champagne">{order.status}</span>
                </div>
                <div className="mt-2 text-sm text-korual-mist">{order.product}</div>
                <div className="mt-3 text-sm font-semibold text-white">{order.value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
