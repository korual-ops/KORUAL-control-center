export const sourcePlatforms = ["1688", "Temu", "CJdropshipping", "Manual"] as const;

export const metrics = [
  { label: "Revenue today", value: "3.84M KRW", detail: "+18% vs 7-day average", tone: "gold" as const },
  { label: "Net profit", value: "1.12M KRW", detail: "29.1% blended margin", tone: "green" as const },
  { label: "Open orders", value: "146", detail: "18 require supplier follow-up", tone: "neutral" as const },
  { label: "AI automations", value: "82%", detail: "Listing and CS flows active", tone: "gold" as const }
];

export const productPipeline = [
  { name: "Cream Embossed Hotel Towel", source: "1688", stage: "Margin review", margin: "34%" },
  { name: "Black Marble Bath Tray", source: "Manual", stage: "Supplier QA", margin: "41%" },
  { name: "Hotel Lifestyle Robe", source: "CJdropshipping", stage: "Listing draft", margin: "28%" },
  { name: "Gold Foil Gift Box", source: "Temu", stage: "Restock candidate", margin: "37%" }
];

export const orders = [
  { id: "KR-2401", product: "Cream Embossed Hotel Towel", status: "Paid", value: "129,000 KRW" },
  { id: "KR-2402", product: "Hotel Lifestyle Robe", status: "Shipping", value: "88,000 KRW" },
  { id: "KR-2403", product: "Gold Foil Gift Box", status: "Delayed", value: "42,000 KRW" }
];

export const reports = {
  dailyRevenue: "3.84M KRW",
  netProfit: "1.12M KRW",
  adSpend: "412K KRW",
  bestSellers: ["Cream Embossed Hotel Towel", "Black Marble Bath Tray", "Gold Foil Gift Box"],
  lowMarginProducts: ["Hotel Lifestyle Robe", "Imported Scent Diffuser"],
  restockCandidates: ["Cream Embossed Hotel Towel", "Gold Foil Gift Box"]
};
