export const automationPipelines = [
  {
    id: 'commerce-sourcing',
    name: 'Commerce Sourcing Agent',
    cadence: 'daily',
    objective: 'Find profitable products, calculate margin, and prepare upload-ready product drafts.',
    inputs: ['supplier_url', 'cost', 'shipping_fee', 'market_price', 'keyword_volume'],
    outputs: ['product_score', 'recommended_price', 'listing_copy', 'risk_flags'],
    guardrails: ['trademark_check', 'kc_or_safety_check', 'customs_check', 'refund_policy_check'],
  },
  {
    id: 'order-ops',
    name: 'Order Operations Agent',
    cadence: 'hourly',
    objective: 'Detect new orders, route fulfillment, update tracking, and notify customers.',
    inputs: ['order_id', 'sku', 'customer_status', 'supplier_status'],
    outputs: ['fulfillment_task', 'tracking_update', 'customer_message'],
    guardrails: ['inventory_check', 'address_check', 'delay_escalation'],
  },
  {
    id: 'cs-agent',
    name: 'Customer Support Agent',
    cadence: 'realtime',
    objective: 'Classify customer requests and generate safe reply drafts.',
    inputs: ['message', 'order_status', 'refund_policy', 'product_info'],
    outputs: ['intent', 'priority', 'reply_draft', 'escalation_required'],
    guardrails: ['refund_policy', 'tone_check', 'legal_claim_avoidance'],
  },
  {
    id: 'travel-agent',
    name: 'Travel Planning Agent',
    cadence: 'on-demand',
    objective: 'Generate itinerary, partner links, and travel revenue opportunities.',
    inputs: ['destination', 'dates', 'budget', 'travel_style'],
    outputs: ['itinerary', 'hotel_links', 'flight_links', 'local_tips'],
    guardrails: ['weather_check', 'airport_distance_check', 'safety_check'],
  },
  {
    id: 'finance-report',
    name: 'Finance Report Agent',
    cadence: 'daily',
    objective: 'Summarize revenue, margin, ad spend, refund rate, and cash flow.',
    inputs: ['sales', 'costs', 'ads', 'refunds', 'subscriptions'],
    outputs: ['daily_profit', 'cashflow_report', 'risk_alerts', 'next_actions'],
    guardrails: ['negative_margin_alert', 'cash_burn_alert', 'refund_spike_alert'],
  },
];

export function runAutomationSnapshot() {
  const now = new Date().toISOString();
  return automationPipelines.map((pipeline) => ({
    ...pipeline,
    status: pipeline.cadence === 'realtime' ? 'watching' : 'scheduled',
    lastCheckedAt: now,
    nextAction: buildNextAction(pipeline.id),
  }));
}

function buildNextAction(id) {
  const actions = {
    'commerce-sourcing': 'Score 10 candidate SKUs and prepare upload drafts.',
    'order-ops': 'Check new orders and delayed fulfillment tasks.',
    'cs-agent': 'Classify incoming customer messages and draft replies.',
    'travel-agent': 'Generate monetizable itinerary when a user enters a city.',
    'finance-report': 'Create daily cash-flow and margin report.',
  };
  return actions[id] || 'Review pipeline status.';
}

export function calculateCommerceMargin({ cost, shippingFee, platformFeeRate, adCost, price }) {
  const totalCost = cost + shippingFee + price * platformFeeRate + adCost;
  const profit = price - totalCost;
  const marginRate = price === 0 ? 0 : profit / price;
  return {
    totalCost: Math.round(totalCost),
    profit: Math.round(profit),
    marginRate: Number((marginRate * 100).toFixed(1)),
    status: marginRate >= 0.35 ? 'healthy' : 'review',
  };
}

export function classifyCustomerMessage(message = '') {
  const text = message.toLowerCase();
  if (text.includes('환불') || text.includes('refund')) return 'refund';
  if (text.includes('배송') || text.includes('tracking') || text.includes('송장')) return 'delivery';
  if (text.includes('교환') || text.includes('exchange')) return 'exchange';
  if (text.includes('대량') || text.includes('wholesale') || text.includes('b2b')) return 'b2b';
  return 'general';
}
