import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ProductForm } from "@/components/ProductForm";

export default function ProductsPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Product Intake" title="Capture sourcing signals before they become margin risk." description="Log supplier URLs, source platform, costs, shipping, and private buying notes for the KORUAL product pipeline." />
      <ProductForm />
    </AppShell>
  );
}
