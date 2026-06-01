import { AppShell } from "@/components/AppShell";
import { MarginCalculator } from "@/components/MarginCalculator";
import { PageHeader } from "@/components/PageHeader";

export default function MarginPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Margin Calculator" title="Price with restraint, protect the profit." description="Model landed cost, customs/VAT, platform and payment fees, ad spend, target margin, selling price, and expected net profit." />
      <MarginCalculator />
    </AppShell>
  );
}
