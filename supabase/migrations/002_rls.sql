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

-- Admin check helper
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PRODUCT TABLES: public read, admin write
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Admin insert products" ON products FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update products" ON products FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete products" ON products FOR DELETE USING (is_admin());

CREATE POLICY "Public read product_images" ON product_images FOR SELECT USING (true);
CREATE POLICY "Admin insert product_images" ON product_images FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update product_images" ON product_images FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete product_images" ON product_images FOR DELETE USING (is_admin());

CREATE POLICY "Public read product_variants" ON product_variants FOR SELECT USING (true);
CREATE POLICY "Admin insert product_variants" ON product_variants FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update product_variants" ON product_variants FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete product_variants" ON product_variants FOR DELETE USING (is_admin());

CREATE POLICY "Public read variant_options" ON variant_options FOR SELECT USING (true);
CREATE POLICY "Admin insert variant_options" ON variant_options FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update variant_options" ON variant_options FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete variant_options" ON variant_options FOR DELETE USING (is_admin());

CREATE POLICY "Public read collections" ON collections FOR SELECT USING (true);
CREATE POLICY "Admin insert collections" ON collections FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update collections" ON collections FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete collections" ON collections FOR DELETE USING (is_admin());

CREATE POLICY "Public read collection_products" ON collection_products FOR SELECT USING (true);
CREATE POLICY "Admin insert collection_products" ON collection_products FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update collection_products" ON collection_products FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete collection_products" ON collection_products FOR DELETE USING (is_admin());

CREATE POLICY "Public read bundle_items" ON bundle_items FOR SELECT USING (true);
CREATE POLICY "Admin insert bundle_items" ON bundle_items FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update bundle_items" ON bundle_items FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete bundle_items" ON bundle_items FOR DELETE USING (is_admin());

-- PROFILES: own data + admin read all
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "System insert profile" ON profiles FOR INSERT WITH CHECK (true);

-- ORDERS: own + admin all
CREATE POLICY "Users read own orders" ON orders FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin update orders" ON orders FOR UPDATE USING (is_admin());

-- ADDRESSES: own data only
CREATE POLICY "Users CRUD own addresses" ON addresses FOR ALL USING (auth.uid() = user_id);

-- WISHLISTS: own data only
CREATE POLICY "Users CRUD own wishlists" ON wishlists FOR ALL USING (auth.uid() = user_id);

-- NEWSLETTER: public insert, admin read/update
CREATE POLICY "Public subscribe" ON newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read subscribers" ON newsletter_subscribers FOR SELECT USING (is_admin());
CREATE POLICY "Admin update subscribers" ON newsletter_subscribers FOR UPDATE USING (is_admin());
