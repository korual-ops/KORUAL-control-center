import { AppShell } from "@/components/AppShell";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { internalServices, privateNetworkMetrics, privateNetworkPeers } from "@/lib/mock-data";

export default function PrivateNetworkPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Private Network"
        title="Approved devices inside the KORUAL operating layer."
        description="Manage fixed internal IPs, device owners, access tiers, and VPN readiness for the private commerce infrastructure."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {privateNetworkMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="glass-card overflow-hidden p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="label">Peer registry</div>
              <h2 className="mt-3 text-2xl font-semibold text-white">Fixed identity for every approved device</h2>
            </div>
            <button className="lux-button">Generate config</button>
          </div>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-[820px] w-full border-collapse text-sm">
              <thead className="bg-white/[0.06] text-left text-xs uppercase tracking-[0.16em] text-korual-mist">
                <tr>
                  <th className="px-4 py-4">Device</th>
                  <th className="px-4 py-4">Owner</th>
                  <th className="px-4 py-4">Type</th>
                  <th className="px-4 py-4">VPN IP</th>
                  <th className="px-4 py-4">Tier</th>
                  <th className="px-4 py-4">Handshake</th>
                  <th className="px-4 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {privateNetworkPeers.map((peer) => (
                  <tr key={peer.vpnIp} className="border-t border-white/10">
                    <td className="px-4 py-4 font-semibold text-white">{peer.name}</td>
                    <td className="px-4 py-4 text-korual-mist">{peer.owner}</td>
                    <td className="px-4 py-4 text-korual-mist">{peer.type}</td>
                    <td className="px-4 py-4 font-mono text-korual-champagne">{peer.vpnIp}</td>
                    <td className="px-4 py-4 text-white">{peer.accessTier}</td>
                    <td className="px-4 py-4 text-korual-mist">{peer.lastHandshake}</td>
                    <td className="px-4 py-4"><StatusPill value={peer.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="premium-panel p-6">
          <div className="label">Security note</div>
          <h2 className="mt-4 text-2xl font-semibold text-white">Private access is granted per device, not per person.</h2>
          <p className="mt-4 text-sm leading-7 text-korual-mist">
            Lost devices should be revoked immediately. Guest access should expire by default. Internal services should remain unavailable from the public internet.
          </p>
          <div className="gold-rule mt-6" />
          <div className="mt-6 grid gap-3">
            <button className="lux-button">Revoke stale peer</button>
            <button className="quiet-button">Open security guide</button>
          </div>
        </aside>
      </section>
      <section className="mt-6 glass-card p-6">
        <div className="label">Internal services</div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {internalServices.map((service) => (
            <div key={service.ip} className="rounded-2xl border border-white/10 bg-black/25 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">{service.name}</div>
                  <div className="mt-2 font-mono text-sm text-korual-champagne">{service.ip}</div>
                </div>
                <StatusPill value={service.status} />
              </div>
              <div className="mt-4 text-sm text-korual-mist">{service.role}</div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
