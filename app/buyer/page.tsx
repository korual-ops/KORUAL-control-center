import { AppShell } from "@/components/AppShell";
import { EditableRegistry, type EditableField } from "@/components/EditableRegistry";
import { PageHeader } from "@/components/PageHeader";
import { buyerEditableProducts, buyerExperience } from "@/lib/mock-data";

type BuyerProduct = (typeof buyerEditableProducts)[number];

const buyerProductFields: EditableField<BuyerProduct>[] = [
  { key: "name", label: "Product" },
  { key: "line", label: "Buyer copy" },
  { key: "price", label: "Price" }
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
            {buyerEditableProducts.map((product) => (
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
      <div className="mt-6">
        <EditableRegistry
          title="Editable buyer-facing products"
          description="Add, edit, or delete customer-facing product cards before connecting them to storefront content."
          fields={buyerProductFields}
          initialItems={buyerEditableProducts}
          storageKey="korual-buyer-products"
        />
      </div>
    </AppShell>
  );
}
