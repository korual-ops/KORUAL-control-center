import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { buyerExperience } from "@/lib/mock-data";

const productCards = [
  { name: "Cream Embossed Hotel Towel", line: "A calm hotel touch for everyday rituals.", price: "from 29,000 KRW" },
  { name: "Black Marble Bath Tray", line: "A quiet object for a more composed bath scene.", price: "from 42,000 KRW" },
  { name: "Gold Foil Gift Box", line: "Gift-ready packaging with restrained presence.", price: "from 12,000 KRW" }
];

export default function BuyerPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Buyer Experience"
        title="A premium purchase journey for quiet daily luxury."
        description="The buyer view separates customer-facing product discovery, purchase confidence, and support language from seller and developer operations."
      />
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="premium-panel p-6 sm:p-8">
          <div className="label">Customer-facing mood</div>
          <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white">
            No Trend. Only Mood.
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-korual-mist">
            KORUAL presents product information with calm confidence: texture, use case, care, delivery, and gift value before aggressive selling.
          </p>
          <div className="gold-rule mt-7" />
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {productCards.map((product) => (
              <div key={product.name} className="rounded-2xl border border-white/10 bg-black/25 p-5">
                <div className="font-semibold text-white">{product.name}</div>
                <div className="mt-3 text-sm leading-6 text-korual-mist">{product.line}</div>
                <div className="mt-5 text-sm font-semibold text-korual-champagne">{product.price}</div>
              </div>
            ))}
          </div>
        </div>
        <aside className="glass-card p-6">
          <div className="label">Buyer principles</div>
          <div className="mt-5 grid gap-3">
            {buyerExperience.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="font-semibold text-white">{item.title}</div>
                <div className="mt-2 text-sm leading-6 text-korual-mist">{item.detail}</div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
