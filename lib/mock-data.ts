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

export const revenueSeries = [
  { day: "Mon", value: 42 },
  { day: "Tue", value: 58 },
  { day: "Wed", value: 50 },
  { day: "Thu", value: 73 },
  { day: "Fri", value: 68 },
  { day: "Sat", value: 88 },
  { day: "Sun", value: 79 }
];

export const operatingQueue = [
  { label: "Supplier delay review", detail: "Gold Foil Gift Box packaging ETA", priority: "High" },
  { label: "Listing approval", detail: "Cafe24 copy for hotel robe collection", priority: "Medium" },
  { label: "Margin check", detail: "Black marble tray ad cost pressure", priority: "Medium" },
  { label: "Restock signal", detail: "Cream embossed towel inventory floor", priority: "Ready" }
];

export const channelPerformance = [
  { channel: "SmartStore", revenue: "1.62M", margin: "32%", status: "Stable" },
  { channel: "Cafe24", revenue: "940K", margin: "38%", status: "Premium" },
  { channel: "Coupang", revenue: "1.28M", margin: "24%", status: "Watch" }
];

export const privateNetworkMetrics = [
  { label: "Gateway status", value: "Online", detail: "10.77.0.1 private gateway", tone: "green" as const },
  { label: "Approved devices", value: "7", detail: "Founder, operator, services", tone: "gold" as const },
  { label: "Internal services", value: "4", detail: "Control, AI, reports, gateway", tone: "neutral" as const },
  { label: "At-risk peers", value: "0", detail: "No stale access detected", tone: "green" as const }
];

export const privateNetworkPeers = [
  {
    name: "Founder MacBook",
    owner: "Founder",
    type: "Admin Device",
    vpnIp: "10.77.0.20",
    accessTier: "Founder",
    lastHandshake: "2 min ago",
    status: "Online"
  },
  {
    name: "Operator Laptop 01",
    owner: "Operations",
    type: "Employee Device",
    vpnIp: "10.77.0.10",
    accessTier: "Operator",
    lastHandshake: "8 min ago",
    status: "Online"
  },
  {
    name: "KORUAL Control Center",
    owner: "System",
    type: "Internal Server",
    vpnIp: "10.77.0.100",
    accessTier: "Service",
    lastHandshake: "Live",
    status: "Online"
  },
  {
    name: "AI Research Worker",
    owner: "Automation",
    type: "Internal Server",
    vpnIp: "10.77.0.110",
    accessTier: "Service",
    lastHandshake: "5 min ago",
    status: "Online"
  }
];

export const internalServices = [
  { name: "KORUAL Control Center", ip: "10.77.0.100", role: "Commerce OS", status: "Live" },
  { name: "AI Worker", ip: "10.77.0.110", role: "Prompt execution", status: "Ready" },
  { name: "Reports Server", ip: "10.77.0.120", role: "Daily brief", status: "Ready" },
  { name: "Gateway", ip: "10.77.0.1", role: "Private access", status: "Live" }
];
