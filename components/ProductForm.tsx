import { sourcePlatforms } from "@/lib/mock-data";

export function ProductForm() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <form className="glass-card grid gap-5 p-6">
        <div>
          <label className="label" htmlFor="product-url">Product URL</label>
          <input id="product-url" className="field mt-2" placeholder="https://detail.1688.com/..." />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="source">Source platform</label>
            <select id="source" className="field mt-2" defaultValue="1688">
              {sourcePlatforms.map((source) => (
                <option key={source}>{source}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="product-name">Working product name</label>
            <input id="product-name" className="field mt-2" placeholder="Cream embossed hotel towel" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="memo">Supplier memo</label>
          <textarea
            id="memo"
            className="field mt-2 min-h-36"
            placeholder="MOQ, fabric, lead time, package options, quality notes..."
          />
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
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="lux-button">Save intake draft</button>
          <button type="button" className="quiet-button">Send to margin review</button>
        </div>
      </form>
      <aside className="premium-panel p-6">
        <div className="label">Intake standard</div>
        <h2 className="mt-4 text-2xl font-semibold text-white">Only products with a clear mood enter the pipeline.</h2>
        <div className="gold-rule mt-5" />
        <ul className="mt-5 grid gap-4 text-sm leading-6 text-korual-mist">
          <li>Supplier memo should capture texture, packaging, MOQ, and defect risk.</li>
          <li>Costs should include purchase, domestic freight, and realistic international shipping.</li>
          <li>Products move forward only when the margin story and KORUAL tone align.</li>
        </ul>
      </aside>
    </div>
  );
}
