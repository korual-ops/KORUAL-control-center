import { AiCopyPanel } from "@/components/AiCopyPanel";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { listingPrompts } from "@/lib/ai";

export default function AiListingPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="AI Listing Generator" title="Turn product facts into premium marketplace language." description="Prompt templates for SmartStore titles, Cafe24 product copy, Coupang descriptions, KORUAL tone copy, and SEO keywords." />
      <AiCopyPanel templates={listingPrompts} />
    </AppShell>
  );
}
