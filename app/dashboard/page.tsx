import { AppShell } from "@/components/AppShell";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import {
  channelPerformance,
  metrics,
  operatingQueue,
  orders,
  productPipeline,
  revenueSeries
} from "@/lib/mock-data";

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
      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="glass-card p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="label">Revenue signal</div>
              <h2 className="mt-3 text-2xl font-semibold text-white">Seven-day luxury demand curve</h2>
            </div>
            <div className="text-sm text-korual-mist">Mock revenue index</div>
          </div>
          <div className="mt-8 flex h-64 items-end gap-3 rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
            {revenueSeries.map((point) => (
              <div key={point.day} className="flex h-full flex-1 flex-col justify-end gap-3">
                <div
                  className="min-h-8 rounded-t-2xl border border-korual-gold/30 bg-gradient-to-t from-korual-gold/25 to-korual-champagne shadow-gold"
                  style={{ height: `${point.value}%` }}
                />
                <div className="text-center text-xs font-semibold text-korual-mist">{point.day}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="premium-panel p-6">
          <div className="label">Operating queue</div>
          <div className="mt-5 grid gap-3">
            {operatingQueue.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{item.label}</div>
                    <div className="mt-1 text-sm leading-6 text-korual-mist">{item.detail}</div>
                  </div>
                  <StatusPill value={item.priority} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
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
      <section className="mt-6 glass-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="label">Channel performance</div>
            <h2 className="mt-3 text-2xl font-semibold text-white">Commerce channels ranked by margin posture</h2>
          </div>
          <button className="quiet-button">View full report</button>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {channelPerformance.map((channel) => (
            <div key={channel.channel} className="rounded-2xl border border-white/10 bg-black/25 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-white">{channel.channel}</div>
                <StatusPill value={channel.status} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-korual-mist">Revenue</div>
                  <div className="mt-2 text-lg font-semibold text-korual-champagne">{channel.revenue}</div>
                </div>
                <div>
                  <div className="text-korual-mist">Margin</div>
                  <div className="mt-2 text-lg font-semibold text-emerald-300">{channel.margin}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-6 ops-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="label">Live order monitor</div>
            <h2 className="mt-2 text-xl font-semibold text-white">Recent commerce movement</h2>
          </div>
          <span className="signal-pill border-emerald-300/25 bg-emerald-300/10 text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            Realtime summary
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="ops-table min-w-[760px]">
            <thead>
              <tr>
                <th>Order</th>
                <th>Product</th>
                <th>Status</th>
                <th>Channel</th>
                <th className="text-right">Value</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => (
                <tr key={order.id}>
                  <td className="font-semibold text-white">{order.id}</td>
                  <td>{order.product}</td>
                  <td>
                    <StatusPill value={order.status} />
                  </td>
                  <td>{index === 0 ? "SmartStore" : index === 1 ? "Cafe24" : "Coupang"}</td>
                  <td className="text-right font-semibold text-korual-champagne">{order.value}</td>
                  <td className="text-white">{order.status === "Delayed" ? "Supplier follow-up" : "Monitor"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
