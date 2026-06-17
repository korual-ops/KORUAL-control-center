"use client";

import { useMemo, useState } from "react";
import { calculateMargin, type MarginInput } from "@/lib/margin";

const defaults: MarginInput = {
  purchaseCost: 7800,
  shippingCost: 2200,
  customsVat: 1800,
  platformFeeRate: 0.12,
  paymentFeeRate: 0.032,
  adCost: 2500,
  targetMarginRate: 0.34
};

const fields: Array<{ key: keyof MarginInput; label: string; suffix?: string; step?: string }> = [
  { key: "purchaseCost", label: "Purchase cost" },
  { key: "shippingCost", label: "Shipping cost" },
  { key: "customsVat", label: "Customs / VAT" },
  { key: "platformFeeRate", label: "Platform fee rate", suffix: "%", step: "0.1" },
  { key: "paymentFeeRate", label: "Payment fee rate", suffix: "%", step: "0.1" },
  { key: "adCost", label: "Ad cost" },
  { key: "targetMarginRate", label: "Target margin", suffix: "%", step: "1" }
];

export function MarginCalculator() {
  const [input, setInput] = useState<MarginInput>(defaults);
  const result = useMemo(() => calculateMargin(input), [input]);

  function update(key: keyof MarginInput, value: string) {
    const raw = Number(value || 0);
    const normalized = key.endsWith("Rate") ? raw / 100 : raw;
    setInput((current) => ({ ...current, [key]: normalized }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="glass-card grid gap-4 p-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="label">Pricing inputs</div>
            <p className="mt-2 text-sm text-korual-mist">Model the full landed cost before publishing.</p>
          </div>
          <div className="hidden rounded-full border border-white/10 px-4 py-2 text-xs text-korual-champagne sm:block">
            Target {Math.round(input.targetMarginRate * 100)}%
          </div>
        </div>
        {fields.map((field) => {
          const value = field.key.endsWith("Rate") ? input[field.key] * 100 : input[field.key];
          return (
            <label key={field.key} className="grid gap-2">
              <span className="label">{field.label}</span>
              <div className="flex items-center gap-2">
                <input
                  className="field"
                  type="number"
                  step={field.step ?? "100"}
                  value={Number(value.toFixed(2))}
                  onChange={(event) => update(field.key, event.target.value)}
                />
                {field.suffix ? <span className="w-10 text-sm text-korual-mist">{field.suffix}</span> : null}
              </div>
            </label>
          );
        })}
      </section>
      <section className="premium-panel p-6">
        <div className="label">Recommended price</div>
        <div className="mt-4 text-5xl font-semibold text-korual-champagne">
          {result.recommendedSellingPrice.toLocaleString()} KRW
        </div>
        <p className="mt-4 text-sm leading-6 text-korual-mist">
          A rounded premium price that protects fee load, ad pressure, and the quiet luxury margin floor.
        </p>
        <div className="gold-rule mt-6" />
        <dl className="mt-8 grid gap-4 text-sm">
          <div className="flex justify-between border-b border-white/10 pb-3">
            <dt className="text-korual-mist">Expected net profit</dt>
            <dd className="font-semibold text-emerald-300">{result.expectedNetProfit.toLocaleString()} KRW</dd>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-3">
            <dt className="text-korual-mist">Total landed cost</dt>
            <dd className="text-white">{result.totalLandedCost.toLocaleString()} KRW</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-korual-mist">Estimated fee load</dt>
            <dd className="text-white">{result.estimatedFees.toLocaleString()} KRW</dd>
          </div>
        </dl>
        <button className="lux-button mt-8 w-full">Approve price scenario</button>
      </section>
    </div>
  );
}
