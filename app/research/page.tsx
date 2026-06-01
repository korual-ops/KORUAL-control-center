import { AppShell } from "@/components/AppShell";
import { EditableField, EditableRegistry } from "@/components/EditableRegistry";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { experimentBacklog, researchMetrics, researchSignals } from "@/lib/mock-data";

type ExperimentIdea = {
  idea: string;
  segment: string;
  hypothesis: string;
  nextStep: string;
  status: string;
};

const experimentFields: EditableField<ExperimentIdea>[] = [
  { key: "idea", label: "Idea" },
  { key: "segment", label: "Segment" },
  { key: "hypothesis", label: "Hypothesis" },
  { key: "nextStep", label: "Next step" },
  { key: "status", label: "Status", kind: "status" }
];

export default function ResearchPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Research Lab"
        title="Turn market signals into disciplined premium commerce bets."
        description="Track customer insights, supplier opportunities, product hypotheses, and next experiments before they enter the launch pipeline."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {researchMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {researchSignals.map((signal) => (
          <section key={signal.signal} className="glass-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="label">{signal.signal}</div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">{signal.confidence} confidence</h2>
              </div>
              <span className="rounded-full border border-korual-gold/25 bg-korual-gold/10 px-3 py-1 text-xs font-semibold text-korual-champagne">
                Signal
              </span>
            </div>
            <p className="mt-5 text-sm leading-6 text-korual-mist">{signal.insight}</p>
            <div className="gold-rule mt-5" />
            <p className="mt-5 text-sm leading-6 text-white">{signal.action}</p>
          </section>
        ))}
      </div>

      <div className="mt-6">
        <EditableRegistry
          title="Editable experiment backlog"
          description="Add, delete, and refine research ideas as the team learns from customer language, supplier data, margin pressure, and premium positioning gaps."
          fields={experimentFields}
          initialItems={experimentBacklog}
          storageKey="korual-research-experiments"
        />
      </div>
    </AppShell>
  );
}
