-- Products
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

ALTER TABLE product_images
  ADD CONSTRAINT fk_variant
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;

-- Collections
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

-- Bundles
CREATE TABLE bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  position INTEGER DEFAULT 0,
  UNIQUE(bundle_id, product_id)
);

-- Profiles (extends Supabase Auth)
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

-- Orders
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

-- Addresses
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

-- Wishlists (normalized FK to products)
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Newsletter
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
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

-- Updated_at trigger
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
