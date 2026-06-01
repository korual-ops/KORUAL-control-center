import { AppShell } from "@/components/AppShell";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { metrics, orders, productPipeline } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="KORUAL Command" title="Quiet luxury commerce, operated with AI discipline." description="Track revenue, net profit, order movement, product sourcing, and automation readiness from one premium control surface." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-card p-6">
          <div className="label">Product pipeline</div>
          <div className="mt-5 grid gap-3">
            {productPipeline.map((product) => (
              <div key={product.name} className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr_auto_auto]">
                <div><div className="font-semibold text-white">{product.name}</div><div className="text-sm text-korual-mist">{product.source}</div></div>
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
              <div key={order.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3"><span className="font-semibold text-white">{order.id}</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs text-korual-champagne">{order.status}</span></div>
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
