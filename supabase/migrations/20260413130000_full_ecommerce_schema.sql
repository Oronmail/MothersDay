-- =============================================================================
-- Full e-commerce schema migration
-- This migration evolves the existing database to the target schema defined in
-- 001_schema.sql and 002_rls.sql
--
-- Existing tables: newsletter_subscribers, profiles, wishlists, addresses, orders
-- New tables: products, product_images, product_variants, variant_options,
--             collections, collection_products, bundle_items
-- =============================================================================

-- =====================
-- 1. NEW TABLES
-- =====================

-- Products
CREATE TABLE IF NOT EXISTS products (
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

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  position INTEGER DEFAULT 0,
  is_variant_image BOOLEAN DEFAULT false,
  variant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_variants (
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

CREATE TABLE IF NOT EXISTS variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value TEXT NOT NULL
);

-- FK from product_images.variant_id -> product_variants.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_variant' AND table_name = 'product_images'
  ) THEN
    ALTER TABLE product_images
      ADD CONSTRAINT fk_variant
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Collections
CREATE TABLE IF NOT EXISTS collections (
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

CREATE TABLE IF NOT EXISTS collection_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  UNIQUE(collection_id, product_id)
);

-- Bundles
CREATE TABLE IF NOT EXISTS bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  position INTEGER DEFAULT 0,
  UNIQUE(bundle_id, product_id)
);

-- =====================
-- 2. ALTER EXISTING TABLES to match target schema
-- =====================

-- profiles: add 'role' column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin'));
  END IF;
END $$;

-- orders: add missing columns (guest_email, order_number, tracking_number, notes, financial_status check, fulfillment_status check)
-- We need to evolve orders from Shopify-centric to our own schema.
-- Add guest_email if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'guest_email'
  ) THEN
    ALTER TABLE orders ADD COLUMN guest_email TEXT;
  END IF;
END $$;

-- Add tracking_number if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'tracking_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN tracking_number TEXT;
  END IF;
END $$;

-- Add notes if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'notes'
  ) THEN
    ALTER TABLE orders ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Make user_id nullable (to support guest orders)
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- wishlists: add product_id FK column if missing (the old schema used product_handle)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE wishlists ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================
-- 3. UPDATE handle_new_user() to include role
-- =====================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'customer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- 4. INDEXES (IF NOT EXISTS)
-- =====================
CREATE INDEX IF NOT EXISTS idx_products_handle ON products(handle);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_collection ON collection_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_product ON collection_products(product_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email);
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);

-- =====================
-- 5. UPDATED_AT TRIGGER
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old triggers if they exist, then create new ones
DROP TRIGGER IF EXISTS set_updated_at ON products;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON collections;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- profiles and orders already have updated_at triggers from previous migrations;
-- replace them with the standard name for consistency
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS set_updated_at ON profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
DROP TRIGGER IF EXISTS set_updated_at ON orders;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- 6. ENABLE RLS ON ALL TABLES
-- =====================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_items ENABLE ROW LEVEL SECURITY;
-- profiles, orders, addresses, wishlists, newsletter_subscribers already have RLS enabled

-- =====================
-- 7. ADMIN HELPER FUNCTION
-- =====================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================
-- 8. RLS POLICIES FOR NEW TABLES
-- =====================

-- Products: public read, admin write
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Admin insert products" ON products FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update products" ON products FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete products" ON products FOR DELETE USING (is_admin());

-- Product images
CREATE POLICY "Public read product_images" ON product_images FOR SELECT USING (true);
CREATE POLICY "Admin insert product_images" ON product_images FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update product_images" ON product_images FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete product_images" ON product_images FOR DELETE USING (is_admin());

-- Product variants
CREATE POLICY "Public read product_variants" ON product_variants FOR SELECT USING (true);
CREATE POLICY "Admin insert product_variants" ON product_variants FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update product_variants" ON product_variants FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete product_variants" ON product_variants FOR DELETE USING (is_admin());

-- Variant options
CREATE POLICY "Public read variant_options" ON variant_options FOR SELECT USING (true);
CREATE POLICY "Admin insert variant_options" ON variant_options FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update variant_options" ON variant_options FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete variant_options" ON variant_options FOR DELETE USING (is_admin());

-- Collections
CREATE POLICY "Public read collections" ON collections FOR SELECT USING (true);
CREATE POLICY "Admin insert collections" ON collections FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update collections" ON collections FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete collections" ON collections FOR DELETE USING (is_admin());

-- Collection products
CREATE POLICY "Public read collection_products" ON collection_products FOR SELECT USING (true);
CREATE POLICY "Admin insert collection_products" ON collection_products FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update collection_products" ON collection_products FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete collection_products" ON collection_products FOR DELETE USING (is_admin());

-- Bundle items
CREATE POLICY "Public read bundle_items" ON bundle_items FOR SELECT USING (true);
CREATE POLICY "Admin insert bundle_items" ON bundle_items FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update bundle_items" ON bundle_items FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete bundle_items" ON bundle_items FOR DELETE USING (is_admin());

-- =====================
-- 9. UPDATE RLS POLICIES FOR EXISTING TABLES
-- =====================

-- Profiles: drop old policies, create new admin-aware ones
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "System insert profile" ON profiles FOR INSERT WITH CHECK (true);

-- Orders: drop old policies, create new admin-aware ones
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "No direct insert to orders" ON orders;
DROP POLICY IF EXISTS "No direct update to orders" ON orders;
DROP POLICY IF EXISTS "No direct delete from orders" ON orders;

CREATE POLICY "Users read own orders" ON orders FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update orders" ON orders FOR UPDATE USING (is_admin());

-- Addresses: drop old policy, create new one
DROP POLICY IF EXISTS "Users can manage own addresses" ON addresses;
CREATE POLICY "Users CRUD own addresses" ON addresses FOR ALL USING (auth.uid() = user_id);

-- Wishlists: drop old policy, create new one
DROP POLICY IF EXISTS "Users can manage own wishlist" ON wishlists;
CREATE POLICY "Users CRUD own wishlists" ON wishlists FOR ALL USING (auth.uid() = user_id);

-- Newsletter: drop old policies, create new admin-aware ones
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON newsletter_subscribers;
DROP POLICY IF EXISTS "No public read access to newsletter subscribers" ON newsletter_subscribers;

CREATE POLICY "Public subscribe" ON newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read subscribers" ON newsletter_subscribers FOR SELECT USING (is_admin());
CREATE POLICY "Admin update subscribers" ON newsletter_subscribers FOR UPDATE USING (is_admin());

-- =====================
-- 10. STORAGE: product-images bucket
-- =====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Admin upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND is_admin());

CREATE POLICY "Admin delete product images" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND is_admin());
