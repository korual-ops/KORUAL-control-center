import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EditableRegistry, type EditableField } from "@/components/EditableRegistry";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { metrics, sellerEditableProducts, sellerWorkflows } from "@/lib/mock-data";

const sellerActions = [
  { label: "Review dashboard", href: "/dashboard" },
  { label: "Add product", href: "/products" },
  { label: "Calculate margin", href: "/margin" },
  { label: "Generate listing", href: "/ai-listing" },
  { label: "Prepare CS reply", href: "/ai-cs" },
  { label: "Open reports", href: "/reports" }
];

type SellerProduct = (typeof sellerEditableProducts)[number];

const sellerProductFields: EditableField<SellerProduct>[] = [
  { key: "name", label: "Product" },
  { key: "source", label: "Source" },
  { key: "stage", label: "Stage", kind: "status" },
  { key: "margin", label: "Margin" }
];

export default function SellerPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Operator / Seller"
        title="Seller OS for controlled commerce execution."
        description="A focused operating surface for sourcing, pricing, listings, customer support, and daily profit decisions."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="glass-card p-6">
          <div className="label">Seller workflows</div>
          <div className="mt-5 grid gap-3">
            {sellerWorkflows.map((workflow) => (
              <div key={workflow.title} className="rounded-2xl border border-white/10 bg-black/25 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-white">{workflow.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-korual-mist">{workflow.detail}</p>
                  </div>
                  <StatusPill value={workflow.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <aside className="premium-panel p-6">
          <div className="label">Seller actions</div>
          <div className="mt-5 grid gap-3">
            {sellerActions.map((action) => (
              <Link key={action.href} href={action.href} className="quiet-button text-center">
                {action.label}
              </Link>
            ))}
          </div>
        </aside>
      </section>
      <div className="mt-6">
        <EditableRegistry
          title="Editable product registry"
          description="Add, edit, or delete seller-side products before they move into connected Supabase records."
          fields={sellerProductFields}
          initialItems={sellerEditableProducts}
          storageKey="korual-seller-products"
        />
      </div>
    </AppShell>
  );
}
