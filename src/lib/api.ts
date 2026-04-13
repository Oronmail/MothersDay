import { supabase } from './supabase';
import type { Product, ProductEdge, Collection, CollectionEdge, BundleItem } from './types';
import { startSpan } from './sentry';

export const MAIN_COLLECTION_HANDLE = 'הכל';

/**
 * Transforms a Supabase product row into the Product shape
 * that all existing components expect.
 */
function transformProduct(row: any): Product {
  return {
    id: row.id,
    title: row.title,
    description: row.description_html?.replace(/<[^>]*>/g, '') || '',
    descriptionHtml: row.description_html || '',
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
  };
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
    if (collectionHandle && collectionHandle !== MAIN_COLLECTION_HANDLE) {
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

      return (data || []).map((row: any) => ({ node: transformProduct(row) }));
    }

    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('status', 'active')
      .order('sort_order');

    if (error) throw error;
    return (data || []).map((row: any) => ({ node: transformProduct(row) }));
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
    return transformProduct(data);
  });
}

export async function getProductRecommendations(productId: string): Promise<ProductEdge[]> {
  return startSpan({ op: 'db.query', name: 'getProductRecommendations' }, async () => {
    const { data: cpRows } = await supabase
      .from('collection_products')
      .select('collection_id')
      .eq('product_id', productId);

    if (!cpRows || cpRows.length === 0) {
      const { data } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('status', 'active')
        .neq('id', productId)
        .limit(4);
      return (data || []).map((row: any) => ({ node: transformProduct(row) }));
    }

    const collectionIds = cpRows.map(cp => cp.collection_id);
    const { data: siblingCpRows } = await supabase
      .from('collection_products')
      .select('product_id')
      .in('collection_id', collectionIds)
      .neq('product_id', productId);

    const siblingIds = [...new Set((siblingCpRows || []).map(cp => cp.product_id))];
    if (siblingIds.length === 0) return [];

    const { data } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .in('id', siblingIds.slice(0, 4))
      .eq('status', 'active');

    return (data || []).map((row: any) => ({ node: transformProduct(row) }));
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
  userId?: string
): Promise<{ orderId: string; orderNumber: number }> {
  const response = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, email, shippingAddress, userId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Failed to create order');
  }

  return response.json();
}
