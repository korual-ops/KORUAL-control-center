import { AppShell } from "@/components/AppShell";
import { EditableRegistry, type EditableField } from "@/components/EditableRegistry";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { developerEditablePeers, developerWorkflows, privateNetworkMetrics, roleMatrix } from "@/lib/mock-data";

type DeveloperPeer = (typeof developerEditablePeers)[number];

const developerPeerFields: EditableField<DeveloperPeer>[] = [
  { key: "name", label: "Device" },
  { key: "owner", label: "Owner" },
  { key: "type", label: "Type" },
  { key: "vpnIp", label: "VPN IP" },
  { key: "accessTier", label: "Tier" },
  { key: "status", label: "Status", kind: "status" }
];

export default function DeveloperPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Developer"
        title="Developer OS for infrastructure, AI, and private network control."
        description="A technical command layer for keeping the KORUAL commerce system buildable, private, and ready for connected services."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {privateNetworkMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="glass-card p-6">
          <div className="label">Engineering workstreams</div>
          <div className="mt-5 grid gap-3">
            {developerWorkflows.map((workflow) => (
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
          <div className="label">Role boundary</div>
          <div className="mt-5 grid gap-3">
            {roleMatrix.map((item) => (
              <div key={item.role} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="font-semibold text-white">{item.role}</div>
                <div className="mt-2 text-sm leading-6 text-korual-mist">{item.focus}</div>
                <div className="mt-3 font-mono text-xs text-korual-champagne">{item.entry}</div>
              </div>
            ))}
          </div>
        </aside>
      </section>
      <div className="mt-6">
        <EditableRegistry
          title="Editable peer registry"
          description="Add, edit, or delete developer-side VPN peers before wiring this workflow to the gateway inventory."
          fields={developerPeerFields}
          initialItems={developerEditablePeers}
          storageKey="korual-developer-peers"
        />
      </div>
    </AppShell>
  );
}
