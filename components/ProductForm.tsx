import { sourcePlatforms } from "@/lib/mock-data";

export function ProductForm() {
  return (
    <form className="glass-card grid gap-5 p-6">
      <div>
        <label className="label" htmlFor="product-url">Product URL</label>
        <input id="product-url" className="field mt-2" placeholder="https://detail.1688.com/..." />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="source">Source platform</label>
          <select id="source" className="field mt-2" defaultValue="1688">
            {sourcePlatforms.map((source) => <option key={source}>{source}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="product-name">Working product name</label>
          <input id="product-name" className="field mt-2" placeholder="Cream embossed hotel towel" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="product-cost">Product cost</label>
          <input id="product-cost" className="field mt-2" type="number" placeholder="7800" />
        </div>
        <div>
          <label className="label" htmlFor="shipping-cost">Shipping cost</label>
          <input id="shipping-cost" className="field mt-2" type="number" placeholder="2200" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="memo">Supplier memo</label>
        <textarea id="memo" className="field mt-2 min-h-32" placeholder="MOQ, fabric, lead time, package options, quality notes..." />
      </div>
      <button className="rounded-xl bg-korual-gold px-5 py-3 text-sm font-bold text-black transition hover:bg-korual-champagne">Save intake draft</button>
    </form>
  );
}
