/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';
import type { Product, ProductEdge, Collection, CollectionEdge, BundleItem } from './types';
import { startSpan } from './sentry';

export const MAIN_COLLECTION_HANDLE = 'הכל';

/**
 * Transforms a Supabase product row into the Product shape
 * that all existing components expect.
 */
function transformProduct(
  row: any,
  bundleContents?: Array<{ title: string; handle: string; quantity: number }>,
): Product {
  // Descriptions may be stored either as legacy HTML (`<p>…</p>`) or as plain text
  // (the admin now edits/saves plain text). Detect which, so plain text renders
  // through the `whitespace-pre-line` branch (preserving line breaks) instead of
  // being injected as raw HTML on a single line.
  const rawDescription = row.description_html || '';
  const descriptionIsHtml = /<[a-z][\s\S]*>/i.test(rawDescription);
  return {
    id: row.id,
    title: row.title,
    description: descriptionIsHtml ? rawDescription.replace(/<[^>]*>/g, '') : rawDescription,
    descriptionHtml: descriptionIsHtml ? rawDescription : '',
    handle: row.handle,
    tags: row.tags || [],
    vendor: row.vendor || 'MothersDay',
    isBundle: row.is_bundle || false,
    priceRange: {
      minVariantPrice: {
        amount: String(row.price || 0),
        currencyCode: 'ILS',
      },
    },
    images: {
      edges: (row.product_images || [])
        .sort((a: any, b: any) => a.position - b.position)
        .map((img: any) => ({
          node: { url: img.url, altText: img.alt_text },
        })),
    },
    variants: {
      edges: (row.product_variants || [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((v: any) => ({
          node: {
            id: v.id,
            title: v.title,
            price: { amount: String(v.price), currencyCode: 'ILS' },
            availableForSale: v.available_for_sale,
            selectedOptions: (v.variant_options || []).map((o: any) => ({
              name: o.name,
              value: o.value,
            })),
          },
        })),
    },
    options: buildOptions(row.product_variants || []),
    imageLayout: row.image_layout || null,
    pageQuantity: row.page_quantity,
    pageSize: row.page_size,
    pageWeight: row.page_weight,
    colorPattern: row.color_pattern,
    paperType: row.paper_type,
    seoTitle: row.seo_title || null,
    seoDescription: row.seo_description || null,
    bundleContents: bundleContents || undefined,
  };
}

/**
 * Fetches the contents (contained product name + handle + qty) for a set of bundle
 * product ids in a single query, keyed by bundle id. Used to show "what's inside"
 * on bundle cards in grids/carousels without an N+1 query per card.
 */
async function getBundleContentsMap(
  bundleIds: string[],
): Promise<Record<string, Array<{ title: string; handle: string; quantity: number }>>> {
  if (bundleIds.length === 0) return {};
  const { data, error } = await supabase
    .from('bundle_items')
    .select('bundle_id, quantity, position, product:product_id(title, handle)')
    .in('bundle_id', bundleIds)
    .order('position');
  if (error || !data) return {};
  const map: Record<string, Array<{ title: string; handle: string; quantity: number }>> = {};
  for (const item of data as any[]) {
    if (!item.product) continue;
    (map[item.bundle_id] ||= []).push({
      title: item.product.title,
      handle: item.product.handle,
      quantity: item.quantity,
    });
  }
  return map;
}

/** Wraps a product-row list into ProductEdges, attaching bundle contents to bundle rows. */
async function toProductEdgesWithBundles(rows: any[]): Promise<ProductEdge[]> {
  const bundleIds = rows.filter((r) => r.is_bundle).map((r) => r.id);
  const contentsMap = await getBundleContentsMap(bundleIds);
  return rows.map((row) => ({ node: transformProduct(row, contentsMap[row.id]) }));
}

function buildOptions(variants: any[]): Array<{ name: string; values: string[] }> {
  const optionMap: Map<string, Set<string>> = new Map();
  for (const v of variants) {
    for (const opt of (v.variant_options || [])) {
      if (!optionMap.has(opt.name)) optionMap.set(opt.name, new Set());
      optionMap.get(opt.name)!.add(opt.value);
    }
  }
  return Array.from(optionMap.entries()).map(([name, values]) => ({
    name,
    values: Array.from(values),
  }));
}

const PRODUCT_SELECT = `
  *,
  product_images(*),
  product_variants(*, variant_options(*))
`;

export async function getProducts(collectionHandle?: string): Promise<ProductEdge[]> {
  return startSpan({ op: 'db.query', name: 'getProducts' }, async () => {
    if (collectionHandle) {
      const { data: collection } = await supabase
        .from('collections')
        .select('id')
        .eq('handle', collectionHandle)
        .single();

      if (!collection) return [];

      const { data: cpRows } = await supabase
        .from('collection_products')
        .select('product_id, position')
        .eq('collection_id', collection.id)
        .order('position');

      if (!cpRows || cpRows.length === 0) return [];

      const productIds = cpRows.map(cp => cp.product_id);
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .in('id', productIds)
        .eq('status', 'active');

      if (error) throw error;

      const posMap = new Map(cpRows.map(cp => [cp.product_id, cp.position]));
      data?.sort((a: any, b: any) => (posMap.get(a.id) || 0) - (posMap.get(b.id) || 0));

      return await toProductEdgesWithBundles(data || []);
    }

    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('status', 'active')
      .order('sort_order');

    if (error) throw error;
    return await toProductEdgesWithBundles(data || []);
  });
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  return startSpan({ op: 'db.query', name: 'getProductByHandle' }, async () => {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('handle', handle)
      .single();

    if (error || !data) return null;
    const product = transformProduct(data);

    // Published collections for the breadcrumb (skip "הכל" — it's the
    // master-ordering collection, not a browse destination).
    const { data: cpRows } = await supabase
      .from('collection_products')
      .select('collections(title, handle, is_published, sort_order)')
      .eq('product_id', product.id);
    const collections = (cpRows ?? [])
      .map((row: any) => (Array.isArray(row.collections) ? row.collections[0] : row.collections))
      .filter((c: any) => c && c.is_published && c.handle !== MAIN_COLLECTION_HANDLE)
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    product.collections = {
      edges: collections.map((c: any) => ({ node: { title: c.title, handle: c.handle } })),
    };

    return product;
  });
}

export interface CarouselProductCard {
  handle: string;
  title: string;
  price: string;
}

/**
 * Lightweight fetch of title + price for a set of product handles, keyed by handle.
 * Used by the homepage shoppable video carousel so the displayed name/price always
 * reflect the real product and can never drift from a hardcoded label.
 */
export async function getProductCardsByHandles(
  handles: string[],
): Promise<Record<string, CarouselProductCard>> {
  const unique = [...new Set(handles)].filter(Boolean);
  if (unique.length === 0) return {};

  const { data, error } = await supabase
    .from('products')
    .select('handle, title, price')
    .in('handle', unique)
    .eq('status', 'active');

  if (error) throw error;

  const map: Record<string, CarouselProductCard> = {};
  for (const row of data || []) {
    map[row.handle] = {
      handle: row.handle,
      title: row.title,
      price: String(row.price ?? ''),
    };
  }
  return map;
}

// Flagship products always surfaced first in "אימהות מוסיפות גם" (on every OTHER
// product page). Order here = display order (first handle shows first / rightmost in RTL).
const RECOMMENDATION_ANCHOR_HANDLES = ['לוח-משפחתי-שבועי', 'מחברת-יום-האם'];
const RECOMMENDATION_LIMIT = 4;

export async function getProductRecommendations(
  productId: string,
  excludeIds: string[] = [],
): Promise<ProductEdge[]> {
  return startSpan({ op: 'db.query', name: 'getProductRecommendations' }, async () => {
    // Ids already shown elsewhere on the page (e.g. the "זמין גם במארזים" bundles) —
    // kept out of the recommendations so nothing appears in two sections at once.
    const excluded = new Set(excludeIds);

    // 1. Anchor products — pinned first, excluding the one currently being viewed.
    const { data: anchorRows } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .in('handle', RECOMMENDATION_ANCHOR_HANDLES)
      .eq('status', 'active')
      .neq('id', productId);

    const orderedAnchors = (anchorRows || [])
      .filter((r: any) => !excluded.has(r.id))
      .sort(
        (a: any, b: any) =>
          RECOMMENDATION_ANCHOR_HANDLES.indexOf(a.handle) -
          RECOMMENDATION_ANCHOR_HANDLES.indexOf(b.handle),
      );
    const anchorIds = new Set(orderedAnchors.map((r: any) => r.id));

    // 2. Collection siblings — fill the remaining slots after the anchors.
    const { data: cpRows } = await supabase
      .from('collection_products')
      .select('collection_id')
      .eq('product_id', productId);

    let siblingRows: any[] = [];
    if (cpRows && cpRows.length > 0) {
      const collectionIds = cpRows.map(cp => cp.collection_id);
      const { data: siblingCpRows } = await supabase
        .from('collection_products')
        .select('product_id')
        .in('collection_id', collectionIds)
        .neq('product_id', productId);

      const siblingIds = [...new Set((siblingCpRows || []).map(cp => cp.product_id))].filter(
        (id) => !anchorIds.has(id) && !excluded.has(id),
      );
      if (siblingIds.length > 0) {
        const { data } = await supabase
          .from('products')
          .select(PRODUCT_SELECT)
          .in('id', siblingIds)
          .eq('status', 'active');
        siblingRows = data || [];
      }
    } else {
      // Product isn't in any collection — fall back to any active products for the fill.
      const { data } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('status', 'active')
        .neq('id', productId)
        .limit(RECOMMENDATION_LIMIT);
      siblingRows = (data || []).filter((r: any) => !anchorIds.has(r.id) && !excluded.has(r.id));
    }

    // 3. Anchors first, then siblings, capped at the limit.
    const combined = [...orderedAnchors, ...siblingRows].slice(0, RECOMMENDATION_LIMIT);
    return toProductEdgesWithBundles(combined);
  });
}

export async function getCollections(): Promise<CollectionEdge[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('is_published', true)
    .order('sort_order');

  if (error) throw error;
  return (data || []).map((row: any) => ({
    node: {
      id: row.id,
      title: row.title,
      handle: row.handle,
      description: row.description,
      imageUrl: row.image_url,
    },
  }));
}

export async function getCollectionByHandle(handle: string): Promise<Collection | null> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('handle', handle)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    title: data.title,
    handle: data.handle,
    description: data.description,
    imageUrl: data.image_url,
  };
}

export async function getBundleItems(bundleProductId: string): Promise<BundleItem[]> {
  const { data, error } = await supabase
    .from('bundle_items')
    .select(`
      id,
      quantity,
      position,
      product:product_id(${PRODUCT_SELECT})
    `)
    .eq('bundle_id', bundleProductId)
    .order('position');

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    product: transformProduct(row.product),
    quantity: row.quantity,
    position: row.position,
  }));
}

/**
 * Returns the bundle products that actually contain the given product,
 * based on the bundle_items relationship (not just the "מארזים" collection).
 */
export async function getBundlesContainingProduct(productId: string): Promise<ProductEdge[]> {
  return startSpan({ op: 'db.query', name: 'getBundlesContainingProduct' }, async () => {
    const { data: itemRows, error: itemsError } = await supabase
      .from('bundle_items')
      .select('bundle_id')
      .eq('product_id', productId);

    if (itemsError) throw itemsError;

    const bundleIds = [...new Set((itemRows || []).map((row: any) => row.bundle_id))];
    if (bundleIds.length === 0) return [];

    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .in('id', bundleIds)
      .eq('status', 'active')
      .order('sort_order');

    if (error) throw error;
    return toProductEdgesWithBundles(data || []);
  });
}

export async function createOrder(
  items: Array<{
    title: string;
    quantity: number;
    price: string;
    image: string;
    product_id: string;
    variant_id: string;
  }>,
  email: string,
  shippingAddress: {
    full_name: string;
    street: string;
    city: string;
    house_number?: string;
    apartment?: string;
    postal_code?: string;
    phone?: string;
  },
  shippingCost: number,
  notes?: string,
): Promise<{ orderId: string; orderNumber: number; orderAccessToken: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // The server derives the customer from the JWT — never from the request body.
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const response = await fetch('/api/create-order', {
    method: 'POST',
    headers,
    body: JSON.stringify({ items, email, shippingAddress, shippingCost, notes }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new CheckoutApiError(
      err.message || err.error || 'Failed to create order',
      err.error || 'unknown_error',
      response.status,
    );
  }

  return response.json();
}

/** Error carrying the server's machine-readable `error` code so the UI can explain it. */
export class CheckoutApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'CheckoutApiError';
    this.code = code;
    this.status = status;
  }
}

export interface CreatePaymentResult {
  paymentPageUrl: string;
  pageRequestUid: string;
}

/**
 * Opens a PayPlus payment page for an existing order.
 * Resolves with the hosted page URL the browser must navigate to.
 * Throws a CheckoutApiError whose `code` is `already_paid` (409),
 * `checkout_disabled` (503), or whatever the server reported.
 */
export async function createPayment(
  orderId: string,
  orderAccessToken: string,
): Promise<CreatePaymentResult> {
  const response = await fetch('/api/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, orderAccessToken }),
  });

  const payload = await response.json().catch(() => null) as
    | (Partial<CreatePaymentResult> & { error?: string; message?: string })
    | null;

  if (!response.ok) {
    throw new CheckoutApiError(
      payload?.message || payload?.error || 'Failed to start payment',
      payload?.error || 'unknown_error',
      response.status,
    );
  }

  if (!payload?.paymentPageUrl) {
    throw new CheckoutApiError('Missing payment page URL', 'missing_payment_url', response.status);
  }

  return { paymentPageUrl: payload.paymentPageUrl, pageRequestUid: payload.pageRequestUid ?? '' };
}
