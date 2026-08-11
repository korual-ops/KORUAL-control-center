/**
 * Supabase 데이터 계약을 한곳에서 관리합니다.
 * 화면 컴포넌트는 DB 컬럼명을 직접 알지 않으며, 이 모듈의 변환기만 사용합니다.
 */
export const cloudTables = Object.freeze({
  products: { table: 'products', orderBy: 'created_at' },
  orders: { table: 'orders', orderBy: 'ordered_at' },
  categories: { table: 'categories', orderBy: 'created_at' },
  content: { table: 'content_items', orderBy: 'created_at' },
  payments: { table: 'bank_transfers', orderBy: 'created_at' },
  suppliers: { table: 'suppliers', orderBy: 'created_at' },
  support: { table: 'support_cases', orderBy: 'created_at' },
  campaigns: { table: 'campaigns', orderBy: 'created_at' },
});

const asNumber = (value) => Number(value) || 0;
const asLocalDateTime = (value) => value?.slice(0, 16) || '';
const asIsoDateTime = (value) => value ? new Date(value).toISOString() : null;
const emptyToNull = (value) => value?.trim() || null;

export const fromCloud = Object.freeze({
  products: (row) => ({
    id: row.id, name: row.name, sku: row.sku || '', category: row.category || '',
    price: asNumber(row.price), stock: asNumber(row.stock), status: row.status,
  }),
  orders: (row) => ({
    id: row.id, name: row.customer_name, sku: row.order_no, category: '주문',
    price: asNumber(row.amount), stock: asNumber(row.quantity), status: row.status,
    customerPhone: row.customer_phone || '',
    shippingDueAt: asLocalDateTime(row.shipping_due_at),
    shippedAt: asLocalDateTime(row.shipped_at),
    trackingNumber: row.tracking_number || '',
    delayNotifiedAt: row.delay_notified_at,
  }),
  categories: (row) => ({
    id: row.id, name: row.name, sku: row.code || '', category: row.parent_name || '',
    price: asNumber(row.sort_order), stock: 0, status: row.status,
  }),
  content: (row) => ({
    id: row.id, name: row.title, sku: row.code || '', category: row.content_type || '',
    price: 0, stock: 0, status: row.status,
  }),
  payments: (row) => ({id:row.id,name:row.depositor_name,sku:row.order_no,category:row.bank_name,price:asNumber(row.amount),stock:asNumber(row.match_score),status:row.status}),
  suppliers: (row) => ({id:row.id,name:row.name,sku:row.code,category:row.region,price:asNumber(row.lead_days),stock:asNumber(row.moq),status:row.status}),
  support: (row) => ({id:row.id,name:row.title,sku:row.case_no,category:row.case_type,price:asNumber(row.refund_amount),stock:asNumber(row.priority),status:row.status}),
  campaigns: (row) => ({id:row.id,name:row.name,sku:row.code,category:row.channel,price:asNumber(row.budget),stock:asNumber(row.asset_count),status:row.status}),
});

export const toCloud = Object.freeze({
  products: (item) => ({
    name: item.name.trim(), sku: item.sku.trim(), category: item.category.trim(),
    price: asNumber(item.price), stock: asNumber(item.stock), status: item.status,
  }),
  orders: (item) => ({
    customer_name: item.name.trim(), order_no: item.sku.trim(),
    amount: asNumber(item.price), quantity: asNumber(item.stock), status: item.status,
    customer_phone: emptyToNull(item.customerPhone),
    shipping_due_at: asIsoDateTime(item.shippingDueAt),
    shipped_at: asIsoDateTime(item.shippedAt),
    tracking_number: emptyToNull(item.trackingNumber),
  }),
  categories: (item) => ({
    name: item.name.trim(), code: item.sku.trim(), parent_name: emptyToNull(item.category),
    sort_order: asNumber(item.price), status: item.status,
  }),
  content: (item) => ({
    title: item.name.trim(), code: item.sku.trim(),
    content_type: item.category.trim(), status: item.status,
  }),
  payments: (item) => ({depositor_name:item.name.trim(),order_no:item.sku.trim(),bank_name:item.category.trim(),amount:asNumber(item.price),match_score:asNumber(item.stock),status:item.status}),
  suppliers: (item) => ({name:item.name.trim(),code:item.sku.trim(),region:item.category.trim(),lead_days:asNumber(item.price),moq:asNumber(item.stock),status:item.status}),
  support: (item) => ({title:item.name.trim(),case_no:item.sku.trim(),case_type:item.category.trim(),refund_amount:asNumber(item.price),priority:asNumber(item.stock),status:item.status}),
  campaigns: (item) => ({name:item.name.trim(),code:item.sku.trim(),channel:item.category.trim(),budget:asNumber(item.price),asset_count:asNumber(item.stock),status:item.status}),
});

export function getCloudResource(page) {
  return cloudTables[page] || null;
}
