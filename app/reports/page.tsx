import { AppShell } from "@/components/AppShell";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { reports } from "@/lib/mock-data";

export default function ReportsPage() {
  const reportMetrics = [
    { label: "Daily revenue", value: reports.dailyRevenue, detail: "Mock sales close", tone: "gold" as const },
    { label: "Net profit", value: reports.netProfit, detail: "After fees and ad spend", tone: "green" as const },
    { label: "Ad spend", value: reports.adSpend, detail: "Meta and marketplace ads", tone: "neutral" as const }
  ];

  return (
    <AppShell>
      <PageHeader eyebrow="Reports" title="Surface what deserves attention before it becomes noise." description="Daily revenue, net profit, ad spend, best sellers, low-margin products, and restock candidates." />
      <div className="grid gap-4 md:grid-cols-3">{reportMetrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {[["Best sellers", reports.bestSellers], ["Low-margin products", reports.lowMarginProducts], ["Restock candidates", reports.restockCandidates]].map(([title, items]) => (
          <section key={title as string} className="glass-card p-6">
            <div className="label">{title as string}</div>
            <ul className="mt-5 grid gap-3">{(items as string[]).map((item) => <li key={item} className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white">{item}</li>)}</ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
