# Shopify Decoupling & Independent Store — Design Spec

**Date:** 2026-04-13
**Approach:** Mirror & Replace (Option A)
**Status:** Draft

---

## 1. Goal

Remove all Shopify and Lovable dependencies from the mothersdayil e-commerce site. Create a fully independent store with its own Supabase backend, admin panel, and Vercel hosting — while preserving the existing design pixel-for-pixel.

## 2. What Changes vs What Stays

### Changes
- **Product data source:** Shopify Storefront GraphQL API → Supabase tables
- **Auth (customers):** Lovable's Supabase → new Supabase project with Google + magic link
- **Auth (admin):** None → dedicated email+password with role-based access
- **Checkout/payment:** Shopify hosted checkout → integration point (provider plugged in later)
- **Media (product images):** Shopify CDN → Supabase Storage
- **Media (videos):** Lovable's Supabase Storage → local `public/videos/` (already downloaded)
- **Hosting:** Lovable → Vercel
- **Repository:** Lovable's GitHub → new repo

### Stays Identical
- All React components (78 components)
- Tailwind CSS + shadcn/ui styling
- RTL layout and Hebrew localization
- Cart state management (Zustand + localStorage)
- React Query data fetching patterns
- Sentry error tracking
- All page layouts and animations

## 3. Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS 3 + shadcn/ui |
| State (client) | Zustand (cart) |
| State (server) | React Query / TanStack Query |
| Database | Supabase (PostgreSQL) — user's own account |
| Auth (customers) | Supabase Auth: Google OAuth (primary) + magic link (fallback) |
| Auth (admin) | Supabase Auth: email+password, `role` column, RLS-enforced |
| File storage | Supabase Storage (product images) |
| Video hosting | Local `public/videos/` served by Vercel |
| Error tracking | Sentry |
| Hosting | Vercel |

## 4. Database Schema

### Existing Tables (recreated from Lovable's Supabase)

**profiles**
- `id` UUID (FK → auth.users) PK
- `full_name` text
- `phone` text
- `role` text DEFAULT 'customer' — values: 'customer' | 'admin'
- `created_at` timestamptz
- `updated_at` timestamptz

**orders**
- `id` UUID PK
- `order_number` serial
- `user_id` UUID (FK → profiles, nullable for guest checkout)
- `guest_email` text (for guest orders)
- `line_items` jsonb — [{title, quantity, price, image, product_id, variant_id}]
- `shipping_address` jsonb — {full_name, phone, street, city, postal_code}
- `total_price` numeric
- `currency_code` text DEFAULT 'ILS'
- `financial_status` text — 'pending' | 'paid' | 'refunded'
- `fulfillment_status` text — 'unfulfilled' | 'shipped' | 'delivered'
- `tracking_number` text
- `notes` text
- `created_at` timestamptz
- `updated_at` timestamptz

**addresses**
- `id` UUID PK
- `user_id` UUID (FK → profiles)
- `label` text
- `full_name` text
- `street` text
- `city` text
- `postal_code` text
- `phone` text
- `is_default` boolean
- `created_at` timestamptz

**wishlists**
- `id` UUID PK
- `user_id` UUID (FK → profiles)
- `product_id` UUID (FK → products)
- `created_at` timestamptz

Note: the existing wishlists table stores denormalized product data (handle, title, image, price). The new schema normalizes this to a `product_id` FK since we now own the products table. Wishlist components will join on products to get current title/image/price instead of reading stale snapshot data.

**Dropped table: `unlinked_orders`** — this existed to handle orphaned orders from Shopify webhooks. No longer needed since we own the entire order flow.

**newsletter_subscribers**
- `id` UUID PK
- `email` text UNIQUE
- `name` text
- `phone` text
- `is_active` boolean DEFAULT true
- `subscribed_at` timestamptz

### New Tables (replace Shopify as product data source)

**products**
- `id` UUID PK
- `handle` text UNIQUE — URL slug
- `title` text
- `description_html` text — rich text HTML
- `vendor` text DEFAULT 'MothersDay'
- `status` text — 'active' | 'draft'
- `is_bundle` boolean DEFAULT false
- `price` numeric — base price (min variant price for products with variants)
- `compare_at_price` numeric — original price for sale display
- `tags` text[] — array of tags
- `page_quantity` text — metafield: e.g. "30 דפים"
- `page_size` text — metafield: e.g. "A4", "A5", "50X70"
- `page_weight` text — metafield: e.g. "120 גרם"
- `color_pattern` text — metafield: e.g. "stone", "powder", "wine"
- `paper_type` text — metafield
- `seo_title` text
- `seo_description` text
- `image_layout` text — layout config for product detail page: 'grid' | 'carousel' | 'grid-carousel' | 'stacked-carousel'. Replaces the hardcoded `productImageLayouts.ts` file. NULL defaults to 'grid'.
- `sort_order` integer DEFAULT 0
- `created_at` timestamptz
- `updated_at` timestamptz

**product_images**
- `id` UUID PK
- `product_id` UUID (FK → products)
- `url` text — Supabase Storage public URL
- `alt_text` text
- `position` integer — display order
- `is_variant_image` boolean DEFAULT false
- `variant_id` UUID (FK → product_variants, nullable)
- `created_at` timestamptz

**product_variants**
- `id` UUID PK
- `product_id` UUID (FK → products)
- `title` text — e.g. "A4" or "Default Title"
- `price` numeric
- `compare_at_price` numeric
- `available_for_sale` boolean DEFAULT true
- `sku` text
- `sort_order` integer DEFAULT 0
- `created_at` timestamptz

**variant_options**
- `id` UUID PK
- `variant_id` UUID (FK → product_variants)
- `name` text — e.g. "Size", "Color"
- `value` text — e.g. "A4", "stone"

**collections**
- `id` UUID PK
- `handle` text UNIQUE — URL slug
- `title` text
- `description` text
- `image_url` text
- `is_published` boolean DEFAULT true
- `sort_order` integer DEFAULT 0
- `created_at` timestamptz
- `updated_at` timestamptz

**collection_products**
- `id` UUID PK
- `collection_id` UUID (FK → collections)
- `product_id` UUID (FK → products)
- `position` integer — sort order within collection
- UNIQUE(collection_id, product_id)

**bundle_items**
- `id` UUID PK
- `bundle_id` UUID (FK → products WHERE is_bundle = true)
- `product_id` UUID (FK → products) — the contained product
- `quantity` integer DEFAULT 1
- `position` integer — display order
- UNIQUE(bundle_id, product_id)

### RLS Policies

**Public read access:**
- `products`, `product_images`, `product_variants`, `variant_options`, `collections`, `collection_products`, `bundle_items` — SELECT for all (anon + authenticated)

**Customer access (authenticated, role = 'customer'):**
- `profiles` — SELECT/UPDATE own row only
- `orders` — SELECT own orders (WHERE user_id = auth.uid() OR guest_email matches)
- `addresses` — full CRUD own rows only
- `wishlists` — full CRUD own rows only

**Admin access (authenticated, role = 'admin'):**
- All product tables — full CRUD
- `orders` — full CRUD (all orders)
- `profiles` — SELECT all (read-only customer list)
- `newsletter_subscribers` — SELECT all

**Guest access (anon):**
- Product tables — SELECT only
- `orders` — INSERT only (for guest checkout)
- `newsletter_subscribers` — INSERT only

## 5. Data Layer Replacement

Replace `src/lib/shopify.ts` with `src/lib/api.ts` (or similar). Same exported function names, same return types — components don't change.

| Current (Shopify) | New (Supabase) |
|---|---|
| `getProducts()` | `supabase.from('products').select('*, product_images(*), product_variants(*, variant_options(*))').eq('status', 'active').order('sort_order')` |
| `getProductByHandle(handle)` | Same query with `.eq('handle', handle).single()` |
| `getProductRecommendations(id)` | Products from same collections, excluding current, limit 4 |
| `getCollections()` | `supabase.from('collections').select('*').eq('is_published', true)` |
| `getCollectionProducts(handle)` | Join through `collection_products` with position ordering |
| `createStorefrontCheckout(items, email, address, userId)` | `createOrder(items, email, address, userId)` — inserts into `orders` table, returns order ID. Payment integration point: order starts as `financial_status: 'pending'` |

### Interface Contract

The new API functions transform Supabase responses into the same TypeScript types that components already consume. The `ShopifyProduct` type is renamed to `Product` but the shape stays identical. Components never know the data source changed.

## 6. Authentication

### Customer Auth (storefront)

- **Primary:** Google OAuth ("Continue with Google" button)
- **Fallback:** Magic link (enter email → click link in inbox)
- **No password registration** — frictionless by design
- **Guest checkout supported** — no auth required to purchase
- **Personal area** (wishlists, order history, profile) requires login
- **Auto-create profile** on first login via Supabase trigger

### Admin Auth

- **Dedicated login page** at `/admin/login`
- **Email + password only** — no Google, no magic link, no public signup
- **Role check:** `profiles.role = 'admin'` verified on every admin route
- **RLS enforced:** even if someone bypasses the UI, database blocks all mutations for non-admin users
- **Account creation:** manual only — created via Supabase dashboard or seed script
- **Separate route guard:** `/admin/*` routes redirect to `/admin/login` if not authenticated as admin

## 7. Admin Panel

### Layout
- Sidebar navigation (fixed right — RTL layout, sidebar on the right)
- Main content area (left)
- All built with shadcn/ui components (same library as storefront)
- Full Hebrew UI — all labels, buttons, placeholders, status text in Hebrew
- RTL text direction throughout (`dir="rtl"`)
- Routes under `/admin/*` with dedicated admin layout

### Pages

**Dashboard (`/admin`)**
- Revenue over time (daily/weekly/monthly)
- Order count trend
- Top selling products
- Average order value
- Customer count
- All derived from `orders` table — no external analytics for v1

**Products (`/admin/products`)**
- Product list with search and collection filter
- Add/edit form: title, description (rich text editor), price, compare-at-price, status
- Image upload to Supabase Storage with drag-and-drop reordering
- Variant management: add options (size, color), set per-variant pricing and availability
- Metafields: page_quantity, page_size, page_weight, color_pattern, paper_type
- SEO fields: title, description, handle (auto-generated from title)

**Bundles (`/admin/bundles`)**
- Create bundle: select products to include, set quantities
- Set bundle price (independent of contained items)
- Bundle-specific images and description
- Preview how bundle appears on storefront

**Collections (`/admin/collections`)**
- Create/edit collections with title, description, image
- Add/remove products from collections
- Drag-and-drop product sort order within collection
- Set collection visibility (published/draft)

**Orders (`/admin/orders`)**
- Order list with filters: status, date range, search by customer name/email
- Order detail view: items, quantities, shipping address, customer info
- Update status: pending → paid → shipped → delivered
- Add tracking number
- View order notes

**Customers (`/admin/customers`)**
- Customer list with search
- Customer detail: profile info, order history, saved addresses, wishlists
- Total spent per customer

**Newsletter (`/admin/newsletter`)**
- Subscriber list with search
- Export functionality (CSV)
- View active/inactive subscribers

**Settings (`/admin/settings`)**
- Admin account management (future)
- Store configuration (future)

## 8. Shopify Import (One-Time Script)

A Node.js/TypeScript script that runs once to seed the new Supabase database.

### Input
- `products_export_1.csv` — Shopify product export
- Shopify CDN URLs from CSV's `Image Src` column
- Bundle mappings from `src/lib/productProperties.ts`
- Collection structure from existing Shopify queries in codebase

### Steps
1. Parse CSV, extract 18 active published products
2. For each product:
   - Create `products` row with title, description, price, metafields, handle
   - Download each image from Shopify CDN → upload to Supabase Storage → create `product_images` row
   - Create `product_variants` and `variant_options` rows
3. Resolve the ₪0 bundle issue: merge active ₪0 bundles with their draft counterparts that have real prices
4. Create `bundle_items` rows based on the hardcoded mappings in `productProperties.ts`
5. Create `collections` rows based on existing collection handles found in the codebase
6. Create `collection_products` entries to assign products to collections

### Output
- Fully populated Supabase database
- All product images in Supabase Storage
- Console report of imported products, images, bundles, collections

## 9. Media Strategy

### Product Images
- Downloaded from Shopify CDN during import
- Stored in Supabase Storage bucket: `product-images`
- Organized by product handle: `product-images/{handle}/{position}.{ext}`
- Public bucket — images served directly via Supabase CDN URL

### Video Clips (already local)

All video files are in `public/videos/`:

| Path | Purpose |
|------|---------|
| `Hero/hero22.mp4` | Homepage hero (desktop) |
| `Hero/hero mobile 2.mp4` | Homepage hero (mobile) |
| `HomeVideoCarousel/HP_VCarousel_1-5.mp4` | Homepage video carousel (5 clips) |
| `ProductVideos/comlete.mp4` | "All products" collection hero |
| `collection-hero-frontpage.mp4` | Frontpage collection hero |
| `collection-hero-weekly.mp4` | Weekly planning collection hero |
| `collection-hero-video.mp4` | Collection hero (general) |

**Code change:** Replace all `supabase.storage.from("videos").getPublicUrl(...)` and `supabase.storage.from("mobile").getPublicUrl(...)` calls with direct local paths (`/videos/...`). The `VideoCarousel` component that dynamically lists files from Supabase Storage will be changed to reference the known local files.

## 10. Cart & Checkout Flow

### Cart (unchanged)
- Zustand store with localStorage persistence
- `addItem()`, `updateQuantity()`, `removeItem()`, `clearCart()`
- Cart drawer UI stays identical

### Checkout (modified)
1. User adds items to cart
2. User proceeds to checkout
3. Collects: email (or uses logged-in user's email), shipping address, phone
4. Creates `orders` row with `financial_status: 'pending'`
5. **Payment integration point:** order is created, system awaits payment confirmation
6. On payment confirmation (future): update `financial_status` to `'paid'`

### Guest Checkout
- No login required
- Collects email + shipping address at checkout
- Order linked via `guest_email` field
- If user later registers with the same email, orders can be retroactively linked

## 11. Cleanup (Lovable / Shopify Removal)

Remove from codebase:
- `src/lib/shopify.ts` — replaced by new Supabase API layer
- `lovable-tagger` dependency and all `data-lovable-*` attributes
- `.lovable/` directory
- Shopify environment variables (`VITE_SHOPIFY_*`)
- Password gate component and logic (session storage check)
- `src/lib/productProperties.ts` hardcoded bundle mappings — replaced by `bundle_items` table
- `src/lib/productImageLayouts.ts` — replaced by `image_layout` column on products table, configurable in admin

Update:
- `VideoCarousel.tsx` — local file references instead of Supabase Storage listing
- `Hero.tsx` — local file references instead of Supabase Storage
- `Collection.tsx` — local file references for collection hero videos
- `cartStore.ts` — replace `createCheckout()` with `createOrder()`
- Supabase client config — point to new project URL and anon key
- Sentry DSN — new project if desired

## 12. Environment Variables

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_SENTRY_DSN=xxx (optional, can keep existing)
VITE_GOOGLE_CLIENT_ID=xxx (for Google OAuth)
```

## 13. Deployment

- **Vercel:** connect new GitHub repo, Vite build (`npm run build`), output `dist/`
- **Domain:** repoint existing domain from Lovable to Vercel
- **Environment variables:** set in Vercel dashboard
- **Supabase:** configure Google OAuth provider, set redirect URLs for auth

## 14. Out of Scope (v1)

- Payment provider integration (placeholder ready)
- Behavior analytics / visitor tracking (order-based analytics only)
- Inventory management
- Discount codes / promotions
- Email transactional notifications (order confirmation, shipping updates)
- Multi-language support
- PWA / offline support
