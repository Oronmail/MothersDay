-- Discounts / coupons
-- Central place to manage promo codes that connect a code to a benefit.
-- (Applying the discount at checkout + reflecting it in the Hyp amount is a
--  separate, later step — this migration is the data layer + admin management.)

CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC NOT NULL DEFAULT 0,
  max_uses INTEGER,                       -- NULL = unlimited
  used_count INTEGER NOT NULL DEFAULT 0,
  first_order_only BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,                 -- NULL = no expiry
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts (code);

ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;

-- Admins manage everything (reuses the existing is_admin() helper from 002_rls.sql).
-- No public/anon access: checkout validation will go through a server-side
-- (service-role) function later, so codes are never fully exposed to the client.
CREATE POLICY "Admin select discounts" ON discounts FOR SELECT USING (is_admin());
CREATE POLICY "Admin insert discounts" ON discounts FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update discounts" ON discounts FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete discounts" ON discounts FOR DELETE USING (is_admin());
