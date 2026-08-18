-- Server-side cart for logged-in customers.
-- One row per user; the browser cart (CartItem[]) is mirrored here by
-- useCartSync so it survives across devices/browsers. Guests keep their
-- cart in localStorage only.
--
-- Until this migration runs in production, the site keeps working:
-- useCartSync detects the missing table (42P01) and stays local-only.

CREATE TABLE IF NOT EXISTS carts (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- Each user manages only their own cart (covers SELECT/INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "Users CRUD own cart" ON carts;
CREATE POLICY "Users CRUD own cart" ON carts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admins can view all carts (e.g. abandoned-cart follow-up in the future)
DROP POLICY IF EXISTS "Admin view carts" ON carts;
CREATE POLICY "Admin view carts" ON carts FOR SELECT USING (is_admin());

-- Same helper defined in 001_schema.sql; re-created here so this migration
-- can run standalone.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS carts_updated_at ON carts;
CREATE TRIGGER carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
