-- Store settings: key-value pairs for store-wide configuration
CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at ON store_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON store_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Public read (storefront needs shipping settings for guest checkout)
CREATE POLICY "Public read store_settings" ON store_settings
  FOR SELECT USING (true);

-- Admin-only write
CREATE POLICY "Admin insert store_settings" ON store_settings
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update store_settings" ON store_settings
  FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete store_settings" ON store_settings
  FOR DELETE USING (is_admin());

-- Seed default shipping settings
INSERT INTO store_settings (key, value) VALUES
  ('shipping_cost', '35'::jsonb),
  ('free_shipping_threshold', '350'::jsonb),
  ('shipping_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Add shipping_cost column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0;
