// Shared order helpers for the admin screens (רשימת הזמנות, כרטיס הזמנה, דשבורד, לקוח).
//
// The Supabase client is untyped, so every row arrives as `any` — which is how the
// admin ended up reading fields that never existed (`order.customer_name`,
// `shipping_address.name`). These types describe what the `orders` table actually
// holds, so a typo becomes a compile error instead of a silent "---".

export type FinancialStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
export type FulfillmentStatus = 'unfulfilled' | 'shipped' | 'delivered';

export interface AdminShippingAddress {
  full_name?: string | null;
  city?: string | null;
  street?: string | null;
  house_number?: string | null;
  apartment?: string | null;
  postal_code?: string | null;
  phone?: string | null;
}

export interface AdminLineItem {
  title?: string | null;
  quantity?: number | null;
  price?: number | string | null;
  image?: string | null;
  product_id?: string | null;
  variant_id?: string | null;
}

export interface AdminOrder {
  id: string;
  order_number: number | null;
  user_id: string | null;
  guest_email: string | null;
  /** Added by the payments migration — the address every order is contactable at. */
  customer_email?: string | null;
  line_items: AdminLineItem[] | null;
  shipping_address: AdminShippingAddress | null;
  subtotal?: number | string | null;
  shipping_cost?: number | string | null;
  discount_code?: string | null;
  discount_amount?: number | string | null;
  total_price: number | string | null;
  currency_code: string | null;
  financial_status: string | null;
  fulfillment_status: string | null;
  tracking_number: string | null;
  /** The delivery note the customer wrote at checkout. */
  notes: string | null;
  created_at: string | null;
  updated_at?: string | null;

  // ---- payment columns: written by the server only, never by the admin form ----
  payment_provider?: string | null;
  payment_page_request_uid?: string | null;
  invoice_number?: string | null;
  invoice_url?: string | null;
  provider_transaction_id?: string | null;
  payment_status_raw?: string | null;
  paid_amount?: number | string | null;
  paid_currency?: string | null;
  paid_at?: string | null;
  card_brand?: string | null;
  card_last4?: string | null;
  approval_number?: string | null;
  payment_raw?: unknown;
  payment_attempts?: number | null;
  expires_at?: string | null;
  cancelled_at?: string | null;
  refunded_at?: string | null;
  confirmation_email_sent_at?: string | null;

  // ---- HFD shipping columns: written only by api/hfd-shipment.ts ----
  hfd_shipment_number?: string | null;
  hfd_rand_number?: string | null;
  hfd_shipment_created_at?: string | null;
  hfd_shipment_cancelled_at?: string | null;
  shipped_email_sent_at?: string | null;
}

const UNKNOWN_LABEL = 'לא ידוע';
const NEUTRAL_BADGE = 'bg-muted text-muted-foreground';

const FINANCIAL_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'ממתין', className: 'bg-yellow-500/20 text-yellow-700' },
  paid: { label: 'שולם', className: 'bg-green-500/20 text-green-700' },
  failed: { label: 'נכשל', className: 'bg-destructive/15 text-destructive' },
  cancelled: { label: 'בוטל', className: NEUTRAL_BADGE },
  refunded: { label: 'הוחזר', className: 'bg-red-500/20 text-red-700' },
};

const FULFILLMENT_STATUS: Record<string, { label: string; className: string }> = {
  unfulfilled: { label: 'לא נשלח', className: 'bg-gray-500/20 text-gray-700' },
  shipped: { label: 'נשלח', className: 'bg-blue-500/20 text-blue-700' },
  delivered: { label: 'נמסר', className: 'bg-green-500/20 text-green-700' },
};

/** Options for the status pickers / filters, in the order they should be shown. */
export const FINANCIAL_STATUS_OPTIONS = (
  ['pending', 'paid', 'failed', 'cancelled', 'refunded'] as FinancialStatus[]
).map((value) => ({ value, label: FINANCIAL_STATUS[value].label }));

export const FULFILLMENT_STATUS_OPTIONS = (
  ['unfulfilled', 'shipped', 'delivered'] as FulfillmentStatus[]
).map((value) => ({ value, label: FULFILLMENT_STATUS[value].label }));

/** Never render a raw English status: anything unmapped becomes "לא ידוע". */
export const financialStatusBadge = (status?: string | null) =>
  (status && FINANCIAL_STATUS[status]) || { label: UNKNOWN_LABEL, className: NEUTRAL_BADGE };

export const fulfillmentStatusBadge = (status?: string | null) =>
  (status && FULFILLMENT_STATUS[status]) || { label: UNKNOWN_LABEL, className: NEUTRAL_BADGE };

export const financialStatusLabel = (status?: string | null) => financialStatusBadge(status).label;
export const fulfillmentStatusLabel = (status?: string | null) => fulfillmentStatusBadge(status).label;

export const formatCurrency = (amount: number | string | null | undefined) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(
    Number.isFinite(num as number) ? (num as number) : 0,
  );
};

export const toNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(num) ? num : null;
};

/** Name comes from the shipping address — the orders table has no customer_name column. */
export const getCustomerName = (order: Pick<AdminOrder, 'shipping_address'>): string | null =>
  order.shipping_address?.full_name?.trim() || null;

/** customer_email is the new column; guest orders that predate it still carry guest_email. */
export const getCustomerEmail = (
  order: Pick<AdminOrder, 'customer_email' | 'guest_email'>,
): string | null => order.customer_email?.trim() || order.guest_email?.trim() || null;

export const getCustomerPhone = (order: Pick<AdminOrder, 'shipping_address'>): string | null =>
  order.shipping_address?.phone?.trim() || null;

export const getLineItems = (order: Pick<AdminOrder, 'line_items'>): AdminLineItem[] =>
  Array.isArray(order.line_items) ? order.line_items : [];

export const getItemsCount = (order: Pick<AdminOrder, 'line_items'>): number =>
  getLineItems(order).reduce((sum, item) => sum + (item.quantity ?? 1), 0);
