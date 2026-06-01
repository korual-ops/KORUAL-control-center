import { AiCopyPanel } from "@/components/AiCopyPanel";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { supportPrompts } from "@/lib/ai";

export default function AiCustomerSupportPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="AI Customer Support" title="Reply with calm precision, even when the order is tense." description="Support templates for delivery inquiries, exchange/refund handling, product questions, and complaint response." />
      <AiCopyPanel templates={supportPrompts} />
    </AppShell>
  );
}
