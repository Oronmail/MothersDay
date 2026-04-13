// src/lib/types.ts

// ===========================
// PRODUCT TYPES
// ===========================
export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  position: number;
}

export interface VariantOption {
  name: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: { amount: string; currencyCode: string };
  availableForSale: boolean;
  selectedOptions: VariantOption[];
}

export interface Product {
  id: string;
  title: string;
  description: string;
  descriptionHtml: string;
  handle: string;
  tags: string[];
  vendor: string;
  isBundle: boolean;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
  images: { edges: Array<{ node: { url: string; altText: string | null } }> };
  variants: { edges: Array<{ node: ProductVariant }> };
  options: Array<{ name: string; values: string[] }>;
  imageLayout: string | null;
  pageQuantity: string | null;
  pageSize: string | null;
  pageWeight: string | null;
  colorPattern: string | null;
  paperType: string | null;
}

/**
 * Wraps Product in { node: Product } to match existing component interface.
 */
export interface ProductEdge {
  node: Product;
}

// ===========================
// COLLECTION TYPES
// ===========================
export interface Collection {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  imageUrl: string | null;
}

export interface CollectionEdge {
  node: Collection;
}

// ===========================
// BUNDLE TYPES
// ===========================
export interface BundleItem {
  id: string;
  product: Product;
  quantity: number;
  position: number;
}

// ===========================
// CART TYPES
// ===========================
export interface CartItem {
  product: ProductEdge;
  variantId: string;
  variantTitle: string;
  price: { amount: string; currencyCode: string };
  quantity: number;
  selectedOptions: VariantOption[];
}

export interface ShippingAddress {
  full_name: string;
  city: string;
  street: string;
  house_number: string;
  apartment?: string;
  postal_code?: string;
  phone?: string;
}

// ===========================
// ORDER TYPES
// ===========================
export interface OrderLineItem {
  title: string;
  quantity: number;
  price: string;
  image: string;
  product_id: string;
  variant_id: string;
}

export interface Order {
  id: string;
  order_number: number;
  user_id: string | null;
  guest_email: string | null;
  line_items: OrderLineItem[];
  shipping_address: ShippingAddress | null;
  total_price: number;
  currency_code: string;
  financial_status: 'pending' | 'paid' | 'refunded';
  fulfillment_status: 'unfulfilled' | 'shipped' | 'delivered';
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ===========================
// ADMIN TYPES
// ===========================
export interface AdminProduct {
  id: string;
  handle: string;
  title: string;
  description_html: string;
  vendor: string;
  status: 'active' | 'draft';
  is_bundle: boolean;
  price: number;
  compare_at_price: number | null;
  tags: string[];
  page_quantity: string | null;
  page_size: string | null;
  page_weight: string | null;
  color_pattern: string | null;
  paper_type: string | null;
  image_layout: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  product_images: Array<{
    id: string;
    url: string;
    alt_text: string | null;
    position: number;
  }>;
  product_variants: Array<{
    id: string;
    title: string;
    price: number;
    available_for_sale: boolean;
    sku: string | null;
  }>;
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'customer' | 'admin';
  created_at: string;
  updated_at: string;
}
