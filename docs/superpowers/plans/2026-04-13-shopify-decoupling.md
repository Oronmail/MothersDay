# Shopify Decoupling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all Shopify/Lovable dependencies, create independent store with Supabase backend, admin panel, and Vercel hosting — preserving existing design pixel-for-pixel.

**Architecture:** Mirror & Replace — copy existing React+Vite+Tailwind codebase to new repo, swap Shopify API layer for Supabase queries, add admin panel as new routes. Site is Hebrew RTL throughout.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS 3, shadcn/ui, Supabase (PostgreSQL + Auth + Storage), Zustand, React Query, Vercel

**Spec:** `docs/superpowers/specs/2026-04-13-shopify-decoupling-design.md`

---

## File Structure (New/Modified Files)

```
src/
├── lib/
│   ├── api.ts                    # NEW — replaces shopify.ts, Supabase product queries
│   ├── supabase.ts               # NEW — Supabase client config (replaces integrations/supabase/client.ts)
│   ├── types.ts                  # NEW — shared Product, CartItem, Collection types
│   ├── productProperties.ts      # MODIFY — remove bundle mappings (now from DB)
│   ├── productImageLayouts.ts    # MODIFY — read image_layout from product data instead of metafield
│   ├── routes.ts                 # MODIFY — add admin routes
│   └── constants.ts              # MODIFY — remove Shopify constants
├── stores/
│   └── cartStore.ts              # MODIFY — remove Shopify checkout, add createOrder()
├── hooks/
│   ├── useAuth.ts                # MODIFY — add role checking
│   └── useAdmin.ts               # NEW — admin auth hook
├── components/
│   ├── Hero.tsx                  # MODIFY — local video paths
│   ├── VideoCarousel.tsx         # MODIFY — local video paths
│   ├── WishlistButton.tsx        # MODIFY — use product_id FK
│   └── admin/                    # NEW — all admin components
│       ├── AdminLayout.tsx
│       ├── AdminSidebar.tsx
│       ├── AdminRoute.tsx        # Route guard
│       ├── AdminLogin.tsx
│       ├── Dashboard.tsx
│       ├── ProductList.tsx
│       ├── ProductForm.tsx
│       ├── BundleForm.tsx
│       ├── CollectionList.tsx
│       ├── CollectionForm.tsx
│       ├── OrderList.tsx
│       ├── OrderDetail.tsx
│       ├── CustomerList.tsx
│       ├── CustomerDetail.tsx
│       └── NewsletterList.tsx
├── pages/
│   ├── Auth.tsx                  # MODIFY — Google + magic link
│   ├── ProductDetail.tsx         # MODIFY — use new API types
│   ├── AllProducts.tsx           # MODIFY — use new API
│   ├── Collection.tsx            # MODIFY — local video paths + new API
│   ├── AllSets.tsx               # MODIFY — use new API
│   ├── Orders.tsx                # MODIFY — updated order schema
│   └── Profile.tsx               # MODIFY — updated profile fields
├── App.tsx                       # MODIFY — add admin routes, remove password gate
scripts/
├── import-products.ts            # NEW — one-time Shopify CSV import
├── download-images.ts            # NEW — download product images from Shopify CDN
└── seed-admin.ts                 # NEW — create admin user in Supabase
supabase/
└── migrations/
    └── 001_schema.sql            # NEW — complete database schema + RLS
```

---

## Phase 1: Foundation

### Task 1: Create New Repository

**Files:**
- Create: new git repo with copied source

- [ ] **Step 1: Create new repo and copy source**

```bash
mkdir ~/mothersdayil-independent
cd ~/mothersdayil-independent
git init
```

Copy all source from current repo EXCEPT:
- `.lovable/` directory
- `.git/` directory
- `node_modules/`

```bash
rsync -av --exclude='.lovable' --exclude='.git' --exclude='node_modules' \
  "/path/to/current/mothersdayil/" ~/mothersdayil-independent/
```

- [ ] **Step 2: Clean package.json — remove Lovable dependency**

Remove from `package.json` devDependencies:
```
"lovable-tagger": "^1.1.11"
```

Remove from `vite.config.ts` any lovable-tagger plugin import and usage.

- [ ] **Step 3: Remove Shopify env vars, add Supabase placeholders**

Create `.env.example`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SENTRY_DSN=your-sentry-dsn
```

Create `.env` with actual values (user provides Supabase project URL and anon key).

- [ ] **Step 4: Update .gitignore**

Add to `.gitignore`:
```
.env
.superpowers/
```

- [ ] **Step 5: Install dependencies and verify build**

```bash
npm install
npm run build
```

Fix any build errors from removed lovable-tagger.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: initialize independent repo from existing codebase"
```

---

### Task 2: Supabase Database Schema

**Files:**
- Create: `supabase/migrations/001_schema.sql`

- [ ] **Step 1: Create migration file with complete schema**

```sql
-- supabase/migrations/001_schema.sql

-- ===========================================
-- PRODUCTS
-- ===========================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description_html TEXT DEFAULT '',
  vendor TEXT DEFAULT 'MothersDay',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft')),
  is_bundle BOOLEAN DEFAULT false,
  price NUMERIC NOT NULL DEFAULT 0,
  compare_at_price NUMERIC,
  tags TEXT[] DEFAULT '{}',
  page_quantity TEXT,
  page_size TEXT,
  page_weight TEXT,
  color_pattern TEXT,
  paper_type TEXT,
  image_layout TEXT CHECK (image_layout IN ('grid-2x2', 'grid-2-large-2-small', 'grid-hero-bottom', 'grid-3x1', 'grid-1-2-1', 'grid-2-1-3-2', 'grid-2-2-4', 'grid-2-left-1-right', 'grid-1-2-right', 'grid-2-stacked', 'grid-2-left-carousel-right', 'grid-custom', NULL)),
  seo_title TEXT,
  seo_description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  position INTEGER DEFAULT 0,
  is_variant_image BOOLEAN DEFAULT false,
  variant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Default Title',
  price NUMERIC NOT NULL DEFAULT 0,
  compare_at_price NUMERIC,
  available_for_sale BOOLEAN DEFAULT true,
  sku TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value TEXT NOT NULL
);

-- Add FK for variant images after product_variants exists
ALTER TABLE product_images
  ADD CONSTRAINT fk_variant
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;

-- ===========================================
-- COLLECTIONS
-- ===========================================
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_published BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE collection_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  UNIQUE(collection_id, product_id)
);

-- ===========================================
-- BUNDLES
-- ===========================================
CREATE TABLE bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  position INTEGER DEFAULT 0,
  UNIQUE(bundle_id, product_id)
);

-- ===========================================
-- USERS & PROFILES (extends Supabase Auth)
-- ===========================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'customer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ===========================================
-- ORDERS
-- ===========================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  guest_email TEXT,
  line_items JSONB NOT NULL DEFAULT '[]',
  shipping_address JSONB,
  total_price NUMERIC NOT NULL DEFAULT 0,
  currency_code TEXT DEFAULT 'ILS',
  financial_status TEXT DEFAULT 'pending' CHECK (financial_status IN ('pending', 'paid', 'refunded')),
  fulfillment_status TEXT DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled', 'shipped', 'delivered')),
  tracking_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- ADDRESSES
-- ===========================================
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT,
  full_name TEXT,
  street TEXT,
  city TEXT,
  postal_code TEXT,
  phone TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- WISHLISTS (normalized — FK to products)
-- ===========================================
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- ===========================================
-- NEWSLETTER
-- ===========================================
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX idx_products_handle ON products(handle);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_collection_products_collection ON collection_products(collection_id);
CREATE INDEX idx_collection_products_product ON collection_products(product_id);
CREATE INDEX idx_bundle_items_bundle ON bundle_items(bundle_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_guest_email ON orders(guest_email);
CREATE INDEX idx_addresses_user ON addresses(user_id);
CREATE INDEX idx_wishlists_user ON wishlists(user_id);

-- ===========================================
-- UPDATED_AT TRIGGER
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 2: Create RLS policies file**

Create `supabase/migrations/002_rls.sql`:

```sql
-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ===========================================
-- PRODUCT TABLES: public read, admin write
-- ===========================================
-- Products
CREATE POLICY "Public read products" ON products
  FOR SELECT USING (true);
CREATE POLICY "Admin insert products" ON products
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update products" ON products
  FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete products" ON products
  FOR DELETE USING (is_admin());

-- Product Images
CREATE POLICY "Public read product_images" ON product_images
  FOR SELECT USING (true);
CREATE POLICY "Admin insert product_images" ON product_images
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update product_images" ON product_images
  FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete product_images" ON product_images
  FOR DELETE USING (is_admin());

-- Product Variants
CREATE POLICY "Public read product_variants" ON product_variants
  FOR SELECT USING (true);
CREATE POLICY "Admin insert product_variants" ON product_variants
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update product_variants" ON product_variants
  FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete product_variants" ON product_variants
  FOR DELETE USING (is_admin());

-- Variant Options
CREATE POLICY "Public read variant_options" ON variant_options
  FOR SELECT USING (true);
CREATE POLICY "Admin insert variant_options" ON variant_options
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update variant_options" ON variant_options
  FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete variant_options" ON variant_options
  FOR DELETE USING (is_admin());

-- Collections
CREATE POLICY "Public read collections" ON collections
  FOR SELECT USING (true);
CREATE POLICY "Admin insert collections" ON collections
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update collections" ON collections
  FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete collections" ON collections
  FOR DELETE USING (is_admin());

-- Collection Products
CREATE POLICY "Public read collection_products" ON collection_products
  FOR SELECT USING (true);
CREATE POLICY "Admin insert collection_products" ON collection_products
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update collection_products" ON collection_products
  FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete collection_products" ON collection_products
  FOR DELETE USING (is_admin());

-- Bundle Items
CREATE POLICY "Public read bundle_items" ON bundle_items
  FOR SELECT USING (true);
CREATE POLICY "Admin insert bundle_items" ON bundle_items
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update bundle_items" ON bundle_items
  FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete bundle_items" ON bundle_items
  FOR DELETE USING (is_admin());

-- ===========================================
-- PROFILES: own data + admin read all
-- ===========================================
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "System insert profile" ON profiles
  FOR INSERT WITH CHECK (true); -- trigger creates profiles

-- ===========================================
-- ORDERS: own orders + guest by email + admin all
-- ===========================================
CREATE POLICY "Users read own orders" ON orders
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_admin()
  );
CREATE POLICY "Insert orders" ON orders
  FOR INSERT WITH CHECK (true); -- guest + authenticated
CREATE POLICY "Admin update orders" ON orders
  FOR UPDATE USING (is_admin());

-- ===========================================
-- ADDRESSES: own data only
-- ===========================================
CREATE POLICY "Users CRUD own addresses" ON addresses
  FOR ALL USING (auth.uid() = user_id);

-- ===========================================
-- WISHLISTS: own data only
-- ===========================================
CREATE POLICY "Users CRUD own wishlists" ON wishlists
  FOR ALL USING (auth.uid() = user_id);

-- ===========================================
-- NEWSLETTER: public insert, admin read
-- ===========================================
CREATE POLICY "Public subscribe" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read subscribers" ON newsletter_subscribers
  FOR SELECT USING (is_admin());
CREATE POLICY "Admin update subscribers" ON newsletter_subscribers
  FOR UPDATE USING (is_admin());
```

- [ ] **Step 3: Run migrations in Supabase**

Go to Supabase dashboard → SQL Editor → paste and run `001_schema.sql`, then `002_rls.sql`.

Or use Supabase CLI:
```bash
npx supabase db push
```

- [ ] **Step 4: Create storage buckets**

In Supabase dashboard → Storage:
1. Create bucket `product-images` — public bucket
2. Create policy: allow public SELECT, allow admin INSERT/UPDATE/DELETE

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase schema and RLS policies"
```

---

### Task 3: Shared Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Create shared types that match existing component expectations**

```typescript
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
  // Metafields
  pageQuantity: string | null;
  pageSize: string | null;
  pageWeight: string | null;
  colorPattern: string | null;
  paperType: string | null;
}

/**
 * Wraps Product in { node: Product } to match existing component interface.
 * Components consume ShopifyProduct shape — we keep this for zero UI changes.
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
  street: string;
  city: string;
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared TypeScript types for products, orders, and admin"
```

---

### Task 4: Supabase Client Setup

**Files:**
- Create: `src/lib/supabase.ts`
- Delete: `src/integrations/supabase/client.ts` (later, in cleanup task)

- [ ] **Step 1: Create new Supabase client**

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: add Supabase client configuration"
```

---

## Phase 2: Data Import

### Task 5: Product Import Script

**Files:**
- Create: `scripts/import-products.ts`
- Create: `scripts/download-images.ts`

- [ ] **Step 1: Create image download script**

```typescript
// scripts/download-images.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!; // service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CsvRow {
  Handle: string;
  Title: string;
  'Image Src': string;
  'Image Position': string;
  'Image Alt Text': string;
}

async function downloadAndUpload(imageUrl: string, storagePath: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Failed to download ${imageUrl}: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const ext = path.extname(new URL(imageUrl).pathname) || '.png';
  const fullPath = `${storagePath}${ext}`;

  const { error } = await supabase.storage
    .from('product-images')
    .upload(fullPath, buffer, {
      contentType: `image/${ext.slice(1)}`,
      upsert: true,
    });

  if (error) throw new Error(`Upload failed for ${fullPath}: ${error.message}`);

  const { data } = supabase.storage.from('product-images').getPublicUrl(fullPath);
  return data.publicUrl;
}

async function main() {
  const csvPath = path.resolve(__dirname, '../products_export_1.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records: CsvRow[] = parse(csvContent, { columns: true, skip_empty_lines: true });

  const imagesByHandle: Map<string, Array<{ url: string; position: number; alt: string }>> = new Map();

  for (const row of records) {
    const handle = row.Handle;
    const imageUrl = row['Image Src'];
    if (!imageUrl) continue;

    if (!imagesByHandle.has(handle)) imagesByHandle.set(handle, []);
    imagesByHandle.get(handle)!.push({
      url: imageUrl,
      position: parseInt(row['Image Position'] || '0', 10),
      alt: row['Image Alt Text'] || '',
    });
  }

  console.log(`Found images for ${imagesByHandle.size} products`);

  for (const [handle, images] of imagesByHandle) {
    console.log(`\nProcessing ${handle} (${images.length} images)...`);
    for (const img of images) {
      try {
        const publicUrl = await downloadAndUpload(img.url, `${handle}/${img.position}`);
        console.log(`  ✓ Image ${img.position}: ${publicUrl}`);
      } catch (err) {
        console.error(`  ✗ Image ${img.position}: ${err}`);
      }
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
```

- [ ] **Step 2: Create product import script**

```typescript
// scripts/import-products.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Bundle mappings from productProperties.ts
const BUNDLE_CONTENTS: Record<string, Array<{ handle: string; quantity: number }>> = {
  'מארז-תכנון': [
    { handle: 'לוח-שבועי', quantity: 1 },
    { handle: 'תכנון-ארוחות-משפחתי-שבועי', quantity: 1 },
    { handle: 'רשימת-קניות-סידורים', quantity: 1 },
  ],
  'מארז-פודרה': [
    { handle: 'לוח-שבועי', quantity: 1 },
    { handle: 'מחברת-שורות-בינונית', quantity: 1 },
    { handle: 'בלוק-תכנון-בינוני', quantity: 1 },
  ],
  'מארז-אבן': [
    { handle: 'רשימת-קניות-סידורים', quantity: 1 },
    { handle: 'מחברת-שורות-קטנה', quantity: 1 },
    { handle: 'בלוק-תכנון-קטן', quantity: 1 },
  ],
  'מארז-יין': [
    { handle: 'תכנון-ארוחות-משפחתי-שבועי', quantity: 1 },
    { handle: 'בלוק-תכנון-גדול', quantity: 1 },
  ],
  'מארז-בלוקים-1': [
    { handle: 'בלוק-תכנון-קטן', quantity: 1 },
    { handle: 'בלוק-תכנון-בינוני', quantity: 1 },
    { handle: 'בלוק-תכנון-גדול', quantity: 1 },
  ],
  'מארז-מחברות': [
    { handle: 'מחברת-שורות-בינונית', quantity: 1 },
    { handle: 'מחברת-שורות-קטנה', quantity: 1 },
  ],
};

// Collections from routes.ts
const COLLECTIONS = [
  { handle: 'הכל', title: 'הכל' },
  { handle: 'frontpage', title: 'מוצרי תכנון לאמא' },
  { handle: 'מוצרי-תכנון-שבועיים', title: 'מוצרי תכנון שבועיים' },
  { handle: 'מוצרי-תכנון-משלימים', title: 'מוצרי תכנון משלימים' },
  { handle: 'מארזים', title: 'מארזים' },
];

interface CsvRow {
  Handle: string;
  Title: string;
  'Body (HTML)': string;
  Vendor: string;
  Status: string;
  Published: string;
  'Option1 Name': string;
  'Option1 Value': string;
  'Variant SKU': string;
  'Variant Price': string;
  'Variant Compare At Price': string;
  'Image Src': string;
  'Image Position': string;
  'Image Alt Text': string;
  'Page Quantity (product.metafields.custom.page_quantity)': string;
  'Page size (product.metafields.custom.page_size)': string;
  'page weight (product.metafields.custom.page_weight)': string;
  'Color (product.metafields.shopify.color-pattern)': string;
  'Paper type (product.metafields.shopify.paper-type)': string;
  'SEO Title': string;
  'SEO Description': string;
  Tags: string;
}

async function main() {
  const csvPath = path.resolve(__dirname, '../products_export_1.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records: CsvRow[] = parse(csvContent, { columns: true, skip_empty_lines: true });

  // Group rows by handle (multiple rows per product for images/variants)
  const productGroups: Map<string, CsvRow[]> = new Map();
  for (const row of records) {
    const handle = row.Handle;
    if (!productGroups.has(handle)) productGroups.set(handle, []);
    productGroups.get(handle)!.push(row);
  }

  console.log(`Found ${productGroups.size} product groups in CSV`);

  // Filter: only active + published products, and resolve ₪0 bundles
  const bundlePrices: Map<string, string> = new Map();
  const productsToImport: Map<string, CsvRow[]> = new Map();

  for (const [handle, rows] of productGroups) {
    const firstRow = rows[0];
    const status = firstRow.Status;
    const published = firstRow.Published;
    const price = firstRow['Variant Price'];
    const title = firstRow.Title;

    // Draft bundles with real prices — save the price for later
    if (status === 'draft' && title?.includes('מארז') && parseFloat(price) > 0) {
      bundlePrices.set(title, price);
      continue;
    }

    // Only import active + published
    if (status === 'active' && published === 'true') {
      productsToImport.set(handle, rows);
    }
  }

  console.log(`Importing ${productsToImport.size} active products`);
  console.log(`Found ${bundlePrices.size} bundle prices from drafts`);

  // 1. Insert collections
  console.log('\n--- Inserting collections ---');
  for (const col of COLLECTIONS) {
    const { error } = await supabase.from('collections').upsert({
      handle: col.handle,
      title: col.title,
      is_published: true,
    }, { onConflict: 'handle' });
    if (error) console.error(`  ✗ Collection ${col.handle}: ${error.message}`);
    else console.log(`  ✓ Collection: ${col.title}`);
  }

  // 2. Insert products
  console.log('\n--- Inserting products ---');
  const productIdMap: Map<string, string> = new Map(); // handle → UUID

  let sortOrder = 0;
  for (const [handle, rows] of productsToImport) {
    const first = rows[0];
    const title = first.Title;
    const isBundle = title?.includes('מארז') || false;
    let price = parseFloat(first['Variant Price'] || '0');

    // Fix ₪0 bundles: use price from draft counterpart
    if (isBundle && price === 0 && bundlePrices.has(title)) {
      price = parseFloat(bundlePrices.get(title)!);
      console.log(`  Fixed bundle price: ${title} → ₪${price}`);
    }

    const product = {
      handle,
      title: title || handle,
      description_html: first['Body (HTML)'] || '',
      vendor: first.Vendor || 'MothersDay',
      status: 'active' as const,
      is_bundle: isBundle,
      price,
      compare_at_price: first['Variant Compare At Price'] ? parseFloat(first['Variant Compare At Price']) : null,
      tags: first.Tags ? first.Tags.split(',').map((t: string) => t.trim()) : [],
      page_quantity: first['Page Quantity (product.metafields.custom.page_quantity)'] || null,
      page_size: first['Page size (product.metafields.custom.page_size)'] || null,
      page_weight: first['page weight (product.metafields.custom.page_weight)'] || null,
      color_pattern: first['Color (product.metafields.shopify.color-pattern)'] || null,
      paper_type: first['Paper type (product.metafields.shopify.paper-type)'] || null,
      seo_title: first['SEO Title'] || null,
      seo_description: first['SEO Description'] || null,
      sort_order: sortOrder++,
    };

    const { data, error } = await supabase
      .from('products')
      .upsert(product, { onConflict: 'handle' })
      .select('id')
      .single();

    if (error) {
      console.error(`  ✗ Product ${handle}: ${error.message}`);
      continue;
    }

    productIdMap.set(handle, data.id);
    console.log(`  ✓ Product: ${title} (₪${price}) → ${data.id}`);

    // Insert images (from already-uploaded Supabase Storage)
    const images = rows
      .filter(r => r['Image Src'])
      .map(r => ({
        product_id: data.id,
        url: r['Image Src'], // Will be updated after image download
        alt_text: r['Image Alt Text'] || null,
        position: parseInt(r['Image Position'] || '0', 10),
      }));

    if (images.length > 0) {
      const { error: imgErr } = await supabase.from('product_images').insert(images);
      if (imgErr) console.error(`    ✗ Images: ${imgErr.message}`);
      else console.log(`    ✓ ${images.length} images`);
    }

    // Insert variants
    const variantRows = rows.filter(r =>
      r['Option1 Value'] && r['Option1 Value'] !== 'Default Title'
    );

    if (variantRows.length > 0) {
      for (const vr of variantRows) {
        const { data: variantData, error: varErr } = await supabase
          .from('product_variants')
          .insert({
            product_id: data.id,
            title: vr['Option1 Value'],
            price: parseFloat(vr['Variant Price'] || '0'),
            sku: vr['Variant SKU'] || null,
            available_for_sale: true,
          })
          .select('id')
          .single();

        if (varErr) {
          console.error(`    ✗ Variant ${vr['Option1 Value']}: ${varErr.message}`);
          continue;
        }

        // Insert variant options
        if (vr['Option1 Name'] && vr['Option1 Value']) {
          await supabase.from('variant_options').insert({
            variant_id: variantData.id,
            name: vr['Option1 Name'],
            value: vr['Option1 Value'],
          });
        }
        console.log(`    ✓ Variant: ${vr['Option1 Value']}`);
      }
    } else {
      // Create default variant
      await supabase.from('product_variants').insert({
        product_id: data.id,
        title: 'Default Title',
        price,
        available_for_sale: true,
      });
    }
  }

  // 3. Insert bundle items
  console.log('\n--- Inserting bundle items ---');
  for (const [bundleHandle, items] of Object.entries(BUNDLE_CONTENTS)) {
    const bundleId = productIdMap.get(bundleHandle);
    if (!bundleId) {
      console.error(`  ✗ Bundle ${bundleHandle}: not found in imported products`);
      continue;
    }

    let pos = 0;
    for (const item of items) {
      const productId = productIdMap.get(item.handle);
      if (!productId) {
        console.error(`    ✗ Bundle item ${item.handle}: not found`);
        continue;
      }

      const { error } = await supabase.from('bundle_items').insert({
        bundle_id: bundleId,
        product_id: productId,
        quantity: item.quantity,
        position: pos++,
      });

      if (error) console.error(`    ✗ ${item.handle}: ${error.message}`);
      else console.log(`    ✓ ${bundleHandle} → ${item.handle}`);
    }
  }

  // 4. Assign products to collections
  console.log('\n--- Assigning products to collections ---');
  // All products go into "הכל" collection
  const allCollectionId = (await supabase.from('collections').select('id').eq('handle', 'הכל').single()).data?.id;
  if (allCollectionId) {
    let pos = 0;
    for (const [handle, productId] of productIdMap) {
      await supabase.from('collection_products').upsert({
        collection_id: allCollectionId,
        product_id: productId,
        position: pos++,
      }, { onConflict: 'collection_id,product_id' });
    }
    console.log(`  ✓ Assigned ${productIdMap.size} products to "הכל"`);
  }

  // Bundles go into "מארזים"
  const bundlesCollectionId = (await supabase.from('collections').select('id').eq('handle', 'מארזים').single()).data?.id;
  if (bundlesCollectionId) {
    let pos = 0;
    for (const [handle, productId] of productIdMap) {
      if (handle.includes('מארז')) {
        await supabase.from('collection_products').upsert({
          collection_id: bundlesCollectionId,
          product_id: productId,
          position: pos++,
        }, { onConflict: 'collection_id,product_id' });
      }
    }
    console.log(`  ✓ Assigned bundles to "מארזים"`);
  }

  console.log('\n=== Import complete ===');
  console.log(`Products: ${productIdMap.size}`);
  console.log(`Collections: ${COLLECTIONS.length}`);
  console.log(`Bundles: ${Object.keys(BUNDLE_CONTENTS).length}`);
}

main().catch(console.error);
```

- [ ] **Step 3: Create admin seed script**

```typescript
// scripts/seed-admin.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: npx tsx scripts/seed-admin.ts <email> <password>');
    process.exit(1);
  }

  // Create auth user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error('Failed to create user:', error.message);
    process.exit(1);
  }

  // Set role to admin
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', data.user.id);

  if (updateError) {
    console.error('Failed to set admin role:', updateError.message);
    process.exit(1);
  }

  console.log(`✓ Admin user created: ${email} (${data.user.id})`);
}

main().catch(console.error);
```

- [ ] **Step 4: Add script dependencies to package.json**

Add to `devDependencies`:
```json
"csv-parse": "^5.5.0",
"tsx": "^4.7.0"
```

Add to `scripts`:
```json
"import:products": "tsx scripts/import-products.ts",
"import:images": "tsx scripts/download-images.ts",
"seed:admin": "tsx scripts/seed-admin.ts"
```

- [ ] **Step 5: Run import**

```bash
SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx npm run import:images
SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx npm run import:products
SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx npm run seed:admin your@email.com yourpassword
```

- [ ] **Step 6: Verify in Supabase dashboard**

Check tables in Supabase dashboard: products, product_images, collections, bundle_items — all populated.

- [ ] **Step 7: Commit**

```bash
git add scripts/ package.json
git commit -m "feat: add product import, image download, and admin seed scripts"
```

---

## Phase 3: Data Layer Swap

### Task 6: API Layer — Replace Shopify with Supabase Queries

**Files:**
- Create: `src/lib/api.ts`

- [ ] **Step 1: Create the new API layer**

```typescript
// src/lib/api.ts
import { supabase } from './supabase';
import { Product, ProductEdge, Collection, CollectionEdge, BundleItem } from './types';
import * as Sentry from '@sentry/react';

export const MAIN_COLLECTION_HANDLE = 'הכל';

/**
 * Transforms a Supabase product row into the Product shape
 * that all existing components expect (matching old Shopify types).
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
  return Sentry.startSpan({ name: 'getProducts' }, async () => {
    let query;

    if (collectionHandle && collectionHandle !== MAIN_COLLECTION_HANDLE) {
      // Get products in specific collection
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

      // Sort by collection position
      const posMap = new Map(cpRows.map(cp => [cp.product_id, cp.position]));
      data?.sort((a, b) => (posMap.get(a.id) || 0) - (posMap.get(b.id) || 0));

      return (data || []).map(row => ({ node: transformProduct(row) }));
    }

    // Default: all active products
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('status', 'active')
      .order('sort_order');

    if (error) throw error;
    return (data || []).map(row => ({ node: transformProduct(row) }));
  });
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  return Sentry.startSpan({ name: 'getProductByHandle' }, async () => {
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
  return Sentry.startSpan({ name: 'getProductRecommendations' }, async () => {
    // Find collections this product belongs to
    const { data: cpRows } = await supabase
      .from('collection_products')
      .select('collection_id')
      .eq('product_id', productId);

    if (!cpRows || cpRows.length === 0) {
      // Fallback: random active products
      const { data } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('status', 'active')
        .neq('id', productId)
        .limit(4);

      return (data || []).map(row => ({ node: transformProduct(row) }));
    }

    // Products from same collections, excluding current
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

    return (data || []).map(row => ({ node: transformProduct(row) }));
  });
}

export async function getCollections(): Promise<CollectionEdge[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('is_published', true)
    .order('sort_order');

  if (error) throw error;
  return (data || []).map(row => ({
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
    postal_code?: string;
    phone?: string;
  },
  userId?: string
): Promise<{ orderId: string; orderNumber: number }> {
  const totalPrice = items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  // Format Israeli phone
  let phone = shippingAddress.phone || '';
  if (phone.startsWith('0')) {
    phone = '+972' + phone.slice(1);
  }

  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId || null,
      guest_email: userId ? null : email,
      line_items: items,
      shipping_address: { ...shippingAddress, phone },
      total_price: totalPrice,
      currency_code: 'ILS',
      financial_status: 'pending',
      fulfillment_status: 'unfulfilled',
    })
    .select('id, order_number')
    .single();

  if (error) throw error;
  return { orderId: data.id, orderNumber: data.order_number };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: add Supabase API layer replacing Shopify queries"
```

---

### Task 7: Update Cart Store

**Files:**
- Modify: `src/stores/cartStore.ts`

- [ ] **Step 1: Replace Shopify checkout with createOrder**

Update imports: replace `createStorefrontCheckout` from `shopify.ts` with `createOrder` from `api.ts`. Replace `CartItem`/`ShippingAddress` imports to use `src/lib/types.ts`.

Replace the `createCheckout` method with:

```typescript
createOrder: async (
  userEmail?: string,
  shippingAddress?: ShippingAddress,
  userId?: string
): Promise<{ orderId: string; orderNumber: number }> => {
  const { items } = get();
  if (items.length === 0) throw new Error('Cart is empty');

  set({ isLoading: true });
  try {
    const orderItems = items.map(item => ({
      title: item.product.node.title,
      quantity: item.quantity,
      price: item.price.amount,
      image: item.product.node.images.edges[0]?.node.url || '',
      product_id: item.product.node.id,
      variant_id: item.variantId,
    }));

    const result = await createOrder(
      orderItems,
      userEmail || '',
      shippingAddress || { full_name: '', street: '', city: '' },
      userId
    );

    // Clear cart after successful order
    set({ items: [], isLoading: false });
    return result;
  } catch (error) {
    set({ isLoading: false });
    throw error;
  }
},
```

Remove `cartId`, `checkoutUrl`, `setCartId`, `setCheckoutUrl` fields — they were Shopify-specific.

- [ ] **Step 2: Commit**

```bash
git add src/stores/cartStore.ts
git commit -m "feat: replace Shopify checkout with Supabase order creation in cart store"
```

---

### Task 8: Update Video Components to Local Paths

**Files:**
- Modify: `src/components/Hero.tsx`
- Modify: `src/components/VideoCarousel.tsx`
- Modify: `src/pages/Collection.tsx`

- [ ] **Step 1: Update Hero.tsx**

Replace the Supabase storage `getPublicUrl` calls with local paths:

```typescript
// Replace the useEffect that fetches video URLs:
// Mobile: '/videos/Hero/hero mobile 2.mp4'
// Desktop: '/videos/Hero/hero22.mp4'

// Remove supabase import
// Remove the try/catch getPublicUrl logic
// Set video URL directly based on isMobile check:
const videoUrl = isMobile
  ? '/videos/Hero/hero mobile 2.mp4'
  : '/videos/Hero/hero22.mp4';
```

- [ ] **Step 2: Update VideoCarousel.tsx**

Replace Supabase Storage listing with static local file references:

```typescript
// Remove supabase storage fetch logic
// Replace with static video list:
const CAROUSEL_VIDEOS = [
  { name: 'HP_VCarousel_1', url: '/videos/HomeVideoCarousel/HP_VCarousel_1.mp4' },
  { name: 'HP_VCarousel_2', url: '/videos/HomeVideoCarousel/HP_VCarousel_2.mp4' },
  { name: 'HP_VCarousel_3', url: '/videos/HomeVideoCarousel/HP_VCarousel_3.mp4' },
  { name: 'HP_VCarousel_4', url: '/videos/HomeVideoCarousel/HP_VCarousel_4.mp4' },
  { name: 'HP_VCarousel_5', url: '/videos/HomeVideoCarousel/HP_VCarousel_5.mp4' },
];

// Keep the VIDEO_PRODUCT_MAP unchanged
// Remove the useEffect that fetches from supabase.storage
// Set videos state directly from CAROUSEL_VIDEOS
```

- [ ] **Step 3: Update Collection.tsx**

Replace the cloud video URL fetch for "all products" collection hero:

```typescript
// Replace:
// supabase.storage.from("videos").getPublicUrl("productsvideo/comlete.mp4")
// With:
const cloudVideoUrl = '/videos/ProductVideos/comlete.mp4';

// Remove the useEffect that fetches cloudVideoUrl
// Remove the useCloudVideo flag — just use the local path directly
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Hero.tsx src/components/VideoCarousel.tsx src/pages/Collection.tsx
git commit -m "feat: use local video paths instead of Supabase Storage"
```

---

### Task 9: Update Page Components to Use New API

**Files:**
- Modify: `src/pages/AllProducts.tsx`
- Modify: `src/pages/ProductDetail.tsx`
- Modify: `src/pages/AllSets.tsx`
- Modify: `src/pages/Collection.tsx`
- Modify: `src/pages/Orders.tsx`

- [ ] **Step 1: Update imports in all page components**

In each file, replace:
```typescript
// Old:
import { storefrontApiRequest, MAIN_COLLECTION_HANDLE } from '@/lib/shopify';
// New:
import { getProducts, getProductByHandle, getProductRecommendations, getCollections, getCollectionByHandle, getBundleItems, MAIN_COLLECTION_HANDLE } from '@/lib/api';
import type { Product, ProductEdge, CartItem } from '@/lib/types';
```

- [ ] **Step 2: Update AllProducts.tsx**

Replace the `useQuery` call that uses `storefrontApiRequest` with direct API calls:

```typescript
// Old: useQuery that calls storefrontApiRequest with GraphQL
// New:
const { data: products } = useQuery({
  queryKey: ['products', selectedCollection],
  queryFn: () => getProducts(selectedCollection || undefined),
});
```

- [ ] **Step 3: Update ProductDetail.tsx**

Replace product fetch and recommendations:

```typescript
// Product fetch:
const { data: product } = useQuery({
  queryKey: ['product', handle],
  queryFn: () => getProductByHandle(handle!),
  enabled: !!handle,
});

// Recommendations:
const { data: recommendations } = useQuery({
  queryKey: ['recommendations', product?.id],
  queryFn: () => getProductRecommendations(product!.id),
  enabled: !!product?.id,
});

// Bundle items (replaces hardcoded getBundleContents):
const { data: bundleItems } = useQuery({
  queryKey: ['bundleItems', product?.id],
  queryFn: () => getBundleItems(product!.id),
  enabled: !!product?.id && product?.isBundle,
});
```

- [ ] **Step 4: Update AllSets.tsx and Collection.tsx similarly**

Same pattern — replace Shopify API calls with new Supabase API functions.

- [ ] **Step 5: Update Orders.tsx**

Update to use new order schema (no more `shopify_order_id`, use `order_number` instead).

- [ ] **Step 6: Commit**

```bash
git add src/pages/
git commit -m "feat: update all page components to use Supabase API"
```

---

### Task 10: Update Wishlist Components

**Files:**
- Modify: `src/components/WishlistButton.tsx` (or wherever wishlist logic lives)

- [ ] **Step 1: Change wishlist to use product_id FK**

Replace all wishlist queries that use `product_handle`, `product_title`, `product_image`, `product_price` with `product_id` FK. Join with products table to get current product data.

```typescript
// Add to wishlist:
await supabase.from('wishlists').insert({
  user_id: userId,
  product_id: productId, // UUID instead of handle
});

// Check if in wishlist:
const { data } = await supabase
  .from('wishlists')
  .select('id')
  .eq('user_id', userId)
  .eq('product_id', productId)
  .single();

// Get user's wishlist with product data:
const { data } = await supabase
  .from('wishlists')
  .select('id, product:product_id(id, title, handle, price, product_images(url, position))')
  .eq('user_id', userId);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WishlistButton.tsx
git commit -m "feat: update wishlists to use product_id FK with joins"
```

---

## Phase 4: Authentication

### Task 11: Customer Auth — Google + Magic Link

**Files:**
- Modify: `src/pages/Auth.tsx`
- Modify: `src/hooks/useAuth.ts`

- [ ] **Step 1: Configure Google OAuth in Supabase dashboard**

In Supabase dashboard → Authentication → Providers:
1. Enable Google provider
2. Set Google Client ID and Secret
3. Set redirect URL: `https://your-domain.com/auth/callback`

Enable Email provider with magic link (disable password signup).

- [ ] **Step 2: Update Auth.tsx with Google + Magic Link UI**

```tsx
// Auth page with two options:
// 1. "המשך עם Google" (Continue with Google) button
// 2. Magic link form: email input + "שלח לי קישור" (Send me a link) button

const handleGoogleLogin = async () => {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/site` },
  });
};

const handleMagicLink = async (email: string) => {
  await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/site` },
  });
  // Show toast: "בדוק את המייל שלך" (Check your email)
};
```

- [ ] **Step 3: Update useAuth.ts to include role**

```typescript
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'customer' | 'admin'>('customer');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchRole(session.user.id);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) fetchRole(session.user.id);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (data) setRole(data.role as 'customer' | 'admin');
  };

  return { user, session, role, isLoading };
};
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Auth.tsx src/hooks/useAuth.ts
git commit -m "feat: implement Google + magic link customer auth"
```

---

### Task 12: Admin Auth — Separate Login + Route Guard

**Files:**
- Create: `src/hooks/useAdmin.ts`
- Create: `src/components/admin/AdminRoute.tsx`
- Create: `src/components/admin/AdminLogin.tsx`

- [ ] **Step 1: Create admin auth hook**

```typescript
// src/hooks/useAdmin.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export const useAdmin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      setUser(session.user);
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      setIsAdmin(data?.role === 'admin');
      setIsLoading(false);
    };

    checkAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          setIsAdmin(data?.role === 'admin');
        } else {
          setIsAdmin(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return { user, isAdmin, isLoading, login, logout };
};
```

- [ ] **Step 2: Create admin route guard**

```tsx
// src/components/admin/AdminRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, isLoading } = useAdmin();

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">טוען...</div>;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  return <>{children}</>;
};
```

- [ ] **Step 3: Create admin login page**

```tsx
// src/components/admin/AdminLogin.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAdmin();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err: any) {
      toast.error('שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background" dir="rtl">
      <div className="w-full max-w-sm p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">ניהול האתר</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="אימייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            dir="ltr"
          />
          <Input
            type="password"
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            dir="ltr"
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'מתחבר...' : 'התחבר'}
          </Button>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAdmin.ts src/components/admin/AdminRoute.tsx src/components/admin/AdminLogin.tsx
git commit -m "feat: add admin auth with route guard and login page"
```

---

## Phase 5: Admin Panel

### Task 13: Admin Layout + Dashboard

**Files:**
- Create: `src/components/admin/AdminLayout.tsx`
- Create: `src/components/admin/AdminSidebar.tsx`
- Create: `src/components/admin/Dashboard.tsx`

- [ ] **Step 1: Create AdminSidebar**

```tsx
// src/components/admin/AdminSidebar.tsx
import { NavLink } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { LayoutDashboard, Package, Gift, FolderOpen, ShoppingCart, Users, Mail, Settings, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/admin', icon: LayoutDashboard, label: 'דשבורד', end: true },
  { to: '/admin/products', icon: Package, label: 'מוצרים' },
  { to: '/admin/bundles', icon: Gift, label: 'מארזים' },
  { to: '/admin/collections', icon: FolderOpen, label: 'קולקציות' },
  { to: '/admin/orders', icon: ShoppingCart, label: 'הזמנות' },
  { to: '/admin/customers', icon: Users, label: 'לקוחות' },
  { to: '/admin/newsletter', icon: Mail, label: 'ניוזלטר' },
];

export const AdminSidebar = () => {
  const { user, logout } = useAdmin();

  return (
    <aside className="w-56 bg-card border-l border-border flex flex-col min-h-screen fixed right-0 top-0" dir="rtl">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold">MD Admin</h2>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-border space-y-2">
        <NavLink
          to="/admin/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent"
        >
          <Settings className="w-4 h-4" />
          הגדרות
        </NavLink>
        <div className="px-3 text-xs text-muted-foreground">
          {user?.email}
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent w-full"
        >
          <LogOut className="w-4 h-4" />
          התנתק
        </button>
      </div>
    </aside>
  );
};
```

- [ ] **Step 2: Create AdminLayout**

```tsx
// src/components/admin/AdminLayout.tsx
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';

export const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <AdminSidebar />
      <main className="mr-56 p-6">
        <Outlet />
      </main>
    </div>
  );
};
```

- [ ] **Step 3: Create Dashboard with order-based analytics**

```tsx
// src/components/admin/Dashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subDays, startOfMonth } from 'date-fns';

export const Dashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: async () => {
      const startOfCurrentMonth = startOfMonth(new Date()).toISOString();
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Orders this month
      const { data: monthOrders } = await supabase
        .from('orders')
        .select('total_price, created_at')
        .gte('created_at', startOfCurrentMonth)
        .eq('financial_status', 'paid');

      // Total customers
      const { count: customerCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'customer');

      // Recent orders (last 10)
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, order_number, total_price, financial_status, fulfillment_status, created_at, shipping_address, line_items')
        .order('created_at', { ascending: false })
        .limit(10);

      // Top products (from order line items)
      const { data: allPaidOrders } = await supabase
        .from('orders')
        .select('line_items')
        .eq('financial_status', 'paid')
        .gte('created_at', thirtyDaysAgo);

      const productSales: Record<string, { title: string; quantity: number; revenue: number }> = {};
      for (const order of allPaidOrders || []) {
        for (const item of (order.line_items as any[]) || []) {
          const key = item.title;
          if (!productSales[key]) productSales[key] = { title: key, quantity: 0, revenue: 0 };
          productSales[key].quantity += item.quantity;
          productSales[key].revenue += parseFloat(item.price) * item.quantity;
        }
      }
      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const totalRevenue = (monthOrders || []).reduce((sum, o) => sum + Number(o.total_price), 0);
      const orderCount = monthOrders?.length || 0;
      const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

      return {
        totalRevenue,
        orderCount,
        avgOrderValue,
        customerCount: customerCount || 0,
        recentOrders: recentOrders || [],
        topProducts,
      };
    },
  });

  const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    pending: { label: 'ממתין', className: 'bg-yellow-500/20 text-yellow-500' },
    paid: { label: 'שולם', className: 'bg-green-500/20 text-green-500' },
    refunded: { label: 'הוחזר', className: 'bg-red-500/20 text-red-500' },
    unfulfilled: { label: 'לא נשלח', className: 'bg-gray-500/20 text-gray-500' },
    shipped: { label: 'נשלח', className: 'bg-blue-500/20 text-blue-500' },
    delivered: { label: 'נמסר', className: 'bg-green-500/20 text-green-500' },
  };

  return (
    <div dir="rtl">
      <h1 className="text-2xl font-bold mb-6">דשבורד</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">הכנסות (חודש)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₪{stats?.totalRevenue?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">הזמנות (חודש)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.orderCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">ממוצע הזמנה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₪{Math.round(stats?.avgOrderValue || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">לקוחות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.customerCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders + Top Products */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">הזמנות אחרונות</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <td className="pb-2">מספר</td>
                    <td>לקוח</td>
                    <td>סכום</td>
                    <td>תשלום</td>
                    <td>משלוח</td>
                    <td>תאריך</td>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentOrders.map((order: any) => (
                    <tr key={order.id} className="border-b border-border/50">
                      <td className="py-2">#{order.order_number}</td>
                      <td>{(order.shipping_address as any)?.full_name || '—'}</td>
                      <td>₪{Number(order.total_price).toLocaleString()}</td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded ${STATUS_LABELS[order.financial_status]?.className || ''}`}>
                          {STATUS_LABELS[order.financial_status]?.label || order.financial_status}
                        </span>
                      </td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded ${STATUS_LABELS[order.fulfillment_status]?.className || ''}`}>
                          {STATUS_LABELS[order.fulfillment_status]?.label || order.fulfillment_status}
                        </span>
                      </td>
                      <td className="text-muted-foreground">
                        {format(new Date(order.created_at), 'dd/MM/yy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">מוצרים מובילים (30 יום)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.topProducts.map((p: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span>{p.title}</span>
                  <span className="text-muted-foreground">₪{p.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/
git commit -m "feat: add admin layout, sidebar, and dashboard"
```

---

### Task 14: Product Management (CRUD)

**Files:**
- Create: `src/components/admin/ProductList.tsx`
- Create: `src/components/admin/ProductForm.tsx`

- [ ] **Step 1: Create ProductList — table with search, filter, add/edit/delete**

Product list page showing all products (active + draft) in a table with columns: image thumbnail, title, price, status, collection, actions (edit/delete). Search bar filters by title. "Add Product" button navigates to `/admin/products/new`.

Key queries:
```typescript
// Fetch all products for admin (includes drafts):
const { data } = await supabase
  .from('products')
  .select('id, handle, title, price, status, is_bundle, sort_order, product_images(url, position)')
  .order('sort_order');

// Delete product:
await supabase.from('products').delete().eq('id', productId);
```

- [ ] **Step 2: Create ProductForm — full product editor**

Product form with fields:
- Title (text input)
- Handle (auto-generated from title, editable)
- Description (rich text — use a simple textarea with HTML for v1)
- Price, Compare-at-price (number inputs)
- Status toggle (active/draft)
- Image upload: drag-and-drop zone, uploads to Supabase Storage `product-images/{handle}/`, sortable list with position
- Metafields section: page_quantity, page_size, page_weight, color_pattern, paper_type
- Image layout dropdown (grid-2x2, grid-2-left-1-right, etc.)
- SEO section: seo_title, seo_description
- Variants section: add/remove variant options, per-variant price and availability
- Tags input

Key mutations:
```typescript
// Create product:
const { data } = await supabase.from('products').insert({...}).select('id').single();

// Update product:
await supabase.from('products').update({...}).eq('id', productId);

// Upload image:
const { data } = await supabase.storage.from('product-images').upload(path, file);

// Reorder images:
await supabase.from('product_images').update({ position: newPosition }).eq('id', imageId);
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ProductList.tsx src/components/admin/ProductForm.tsx
git commit -m "feat: add product list and form with CRUD operations"
```

---

### Task 15: Bundle Management

**Files:**
- Create: `src/components/admin/BundleForm.tsx`

- [ ] **Step 1: Create BundleForm**

Extends ProductForm with a "Bundle Contents" section:
- Product picker: dropdown/search to select products to include
- Quantity per item
- Drag-and-drop reorder
- Shows total value of included items vs bundle price

Key queries:
```typescript
// Get available products for bundle picker (non-bundle products):
const { data } = await supabase
  .from('products')
  .select('id, title, handle, price')
  .eq('status', 'active')
  .eq('is_bundle', false);

// Save bundle items:
await supabase.from('bundle_items').delete().eq('bundle_id', bundleId);
await supabase.from('bundle_items').insert(items.map((item, i) => ({
  bundle_id: bundleId,
  product_id: item.productId,
  quantity: item.quantity,
  position: i,
})));
```

Bundle list is filtered from ProductList where `is_bundle = true`.

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/BundleForm.tsx
git commit -m "feat: add bundle management with product picker"
```

---

### Task 16: Collection Management

**Files:**
- Create: `src/components/admin/CollectionList.tsx`
- Create: `src/components/admin/CollectionForm.tsx`

- [ ] **Step 1: Create CollectionList and CollectionForm**

CollectionList: table of collections with title, product count, published status, actions.

CollectionForm:
- Title, handle, description
- Image upload
- Published toggle
- Product assignment: search/add products, drag-and-drop sort order

Key queries:
```typescript
// Get collections with product counts:
const { data } = await supabase
  .from('collections')
  .select('*, collection_products(count)')
  .order('sort_order');

// Assign products to collection:
await supabase.from('collection_products').upsert(
  productIds.map((pid, i) => ({
    collection_id: collectionId,
    product_id: pid,
    position: i,
  })),
  { onConflict: 'collection_id,product_id' }
);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/CollectionList.tsx src/components/admin/CollectionForm.tsx
git commit -m "feat: add collection management with product assignment"
```

---

### Task 17: Order Management

**Files:**
- Create: `src/components/admin/OrderList.tsx`
- Create: `src/components/admin/OrderDetail.tsx`

- [ ] **Step 1: Create OrderList**

Table with columns: order number, customer name, items count, total, payment status, fulfillment status, date. Filters: status dropdown, date range. Click to navigate to detail.

```typescript
const { data } = await supabase
  .from('orders')
  .select('*')
  .order('created_at', { ascending: false })
  .range(offset, offset + pageSize - 1);
```

- [ ] **Step 2: Create OrderDetail**

Shows full order info: line items with images, shipping address, status badges. Actions:
- Update financial_status (pending → paid → refunded)
- Update fulfillment_status (unfulfilled → shipped → delivered)
- Add tracking number
- Add notes

```typescript
// Update order status:
await supabase.from('orders').update({
  financial_status: newStatus,
  tracking_number: trackingNumber,
}).eq('id', orderId);
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/OrderList.tsx src/components/admin/OrderDetail.tsx
git commit -m "feat: add order list and detail with status management"
```

---

### Task 18: Customer + Newsletter Management

**Files:**
- Create: `src/components/admin/CustomerList.tsx`
- Create: `src/components/admin/CustomerDetail.tsx`
- Create: `src/components/admin/NewsletterList.tsx`

- [ ] **Step 1: Create CustomerList and CustomerDetail**

CustomerList: table of profiles (role = 'customer') with name, email, total orders, total spent.

```typescript
// Customers with order stats:
const { data: customers } = await supabase
  .from('profiles')
  .select('id, full_name, phone, created_at')
  .eq('role', 'customer')
  .order('created_at', { ascending: false });

// For each customer, get order stats:
const { data: orders } = await supabase
  .from('orders')
  .select('total_price')
  .eq('user_id', customerId);
```

CustomerDetail: profile info, order list, saved addresses, wishlists.

- [ ] **Step 2: Create NewsletterList**

Table of subscribers with email, name, phone, active status, date. Export CSV button.

```typescript
const { data } = await supabase
  .from('newsletter_subscribers')
  .select('*')
  .order('subscribed_at', { ascending: false });

// CSV export:
const csv = data.map(s => `${s.email},${s.name},${s.phone},${s.is_active}`).join('\n');
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/CustomerList.tsx src/components/admin/CustomerDetail.tsx src/components/admin/NewsletterList.tsx
git commit -m "feat: add customer and newsletter management"
```

---

### Task 19: Wire Up Admin Routes in App.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/lib/routes.ts`

- [ ] **Step 1: Add admin routes to routes.ts**

```typescript
// Add to ROUTES:
adminLogin: '/admin/login',
admin: '/admin',
adminProducts: '/admin/products',
adminProductNew: '/admin/products/new',
adminProductEdit: '/admin/products/:id',
adminBundles: '/admin/bundles',
adminBundleNew: '/admin/bundles/new',
adminBundleEdit: '/admin/bundles/:id',
adminCollections: '/admin/collections',
adminCollectionNew: '/admin/collections/new',
adminCollectionEdit: '/admin/collections/:id',
adminOrders: '/admin/orders',
adminOrderDetail: '/admin/orders/:id',
adminCustomers: '/admin/customers',
adminCustomerDetail: '/admin/customers/:id',
adminNewsletter: '/admin/newsletter',
adminSettings: '/admin/settings',
```

- [ ] **Step 2: Add routes to App.tsx**

```tsx
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminRoute } from '@/components/admin/AdminRoute';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { Dashboard } from '@/components/admin/Dashboard';
// ... import all admin components

// Add to router:
<Route path="/admin/login" element={<AdminLogin />} />
<Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
  <Route index element={<Dashboard />} />
  <Route path="products" element={<ProductList />} />
  <Route path="products/new" element={<ProductForm />} />
  <Route path="products/:id" element={<ProductForm />} />
  <Route path="bundles" element={<ProductList bundles />} />
  <Route path="bundles/new" element={<BundleForm />} />
  <Route path="bundles/:id" element={<BundleForm />} />
  <Route path="collections" element={<CollectionList />} />
  <Route path="collections/new" element={<CollectionForm />} />
  <Route path="collections/:id" element={<CollectionForm />} />
  <Route path="orders" element={<OrderList />} />
  <Route path="orders/:id" element={<OrderDetail />} />
  <Route path="customers" element={<CustomerList />} />
  <Route path="customers/:id" element={<CustomerDetail />} />
  <Route path="newsletter" element={<NewsletterList />} />
</Route>
```

- [ ] **Step 3: Remove password gate**

Remove the `UnderConstruction` / password gate component and its route. Make `/site` the default route or redirect `/` to `/site`.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/lib/routes.ts
git commit -m "feat: wire up admin routes and remove password gate"
```

---

## Phase 6: Cleanup & Deploy

### Task 20: Remove Shopify & Lovable Artifacts

**Files:**
- Delete: `src/lib/shopify.ts`
- Delete: `src/integrations/supabase/` (entire directory — replaced by `src/lib/supabase.ts`)
- Modify: all files importing from old paths

- [ ] **Step 1: Delete Shopify API file**

```bash
rm src/lib/shopify.ts
```

- [ ] **Step 2: Delete old Supabase integration directory**

```bash
rm -rf src/integrations/supabase/
```

- [ ] **Step 3: Update all imports**

Find and replace all occurrences of:
- `from '@/integrations/supabase/client'` → `from '@/lib/supabase'`
- `from '@/integrations/supabase/types'` → remove (types now in `@/lib/types`)
- `from '@/lib/shopify'` → `from '@/lib/api'`

- [ ] **Step 4: Remove lovable-tagger from vite config**

Remove the lovable-tagger plugin import and usage from `vite.config.ts`.

- [ ] **Step 5: Remove Shopify environment variables**

Delete from `.env`:
```
VITE_SHOPIFY_STORE_DOMAIN
VITE_SHOPIFY_STOREFRONT_TOKEN
VITE_SHOPIFY_API_VERSION
```

- [ ] **Step 6: Clean up productProperties.ts**

Remove `BUNDLE_CONTENTS`, `getBundleContents()`, `getBundlesForProduct()` — bundle data now comes from DB via `getBundleItems()` in `api.ts`.

Keep `getProductProperties()`, `isWideProduct()`, `WIDE_PRODUCT_TITLES` — these are display helpers not tied to Shopify.

- [ ] **Step 7: Update productImageLayouts.ts**

Update `parseImageLayout()` to read from the product's `imageLayout` field (passed through from Supabase) instead of Shopify metafield.

- [ ] **Step 8: Remove data-lovable attributes**

Search and remove all `data-lov-*` attributes from components (grep for `data-lov`).

- [ ] **Step 9: Build and fix errors**

```bash
npm run build
```

Fix any remaining import errors or type mismatches.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: remove all Shopify and Lovable dependencies"
```

---

### Task 21: Vercel Deployment

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create vercel.json**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/((?!assets|videos|images).*)", "destination": "/index.html" }
  ]
}
```

The rewrite ensures client-side routing works — all non-asset paths serve `index.html`.

- [ ] **Step 2: Set environment variables in Vercel**

In Vercel dashboard → Settings → Environment Variables:
```
VITE_SUPABASE_URL = https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY = xxx
VITE_SENTRY_DSN = xxx
```

- [ ] **Step 3: Configure Supabase auth redirect URLs**

In Supabase dashboard → Authentication → URL Configuration:
- Site URL: `https://your-domain.com`
- Redirect URLs: `https://your-domain.com/site`, `https://your-domain.com/admin`

- [ ] **Step 4: Push to new GitHub repo and connect Vercel**

```bash
git remote add origin https://github.com/your-org/mothersdayil-independent.git
git push -u origin main
```

Connect repo in Vercel dashboard → New Project → Import.

- [ ] **Step 5: Deploy and verify**

Verify:
1. Homepage loads with videos
2. Product pages show images from Supabase Storage
3. Cart adds/removes items
4. Google login works
5. Admin login at `/admin/login` works
6. Admin dashboard shows (empty stats is fine)
7. Product CRUD in admin panel works

- [ ] **Step 6: Repoint domain**

In your DNS provider, update the domain's CNAME/A records to point to Vercel instead of Lovable.

- [ ] **Step 7: Commit vercel.json**

```bash
git add vercel.json
git commit -m "feat: add Vercel deployment configuration"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1. Foundation | 1-4 | New repo, Supabase schema, types, client |
| 2. Data Import | 5 | Import products, images, bundles from CSV |
| 3. Data Layer Swap | 6-10 | Replace Shopify API, update cart/video/wishlist components |
| 4. Authentication | 11-12 | Customer Google+magic link, admin email+password |
| 5. Admin Panel | 13-19 | Dashboard, products, bundles, collections, orders, customers, newsletter, routes |
| 6. Cleanup & Deploy | 20-21 | Remove Shopify/Lovable, Vercel deploy |
