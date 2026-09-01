-- =============================================================================
-- Payments (PayPlus) + pre-launch hardening
--
-- 1. Payment tracking columns on orders (provider data stops squatting in `notes`)
-- 2. payment_events: append-only webhook log = idempotency key + audit trail
-- 3. mark_order_paid(): atomic, idempotent pending→paid transition with
--    amount verification and inventory decrement
-- 4. SECURITY: drop the anon "Insert orders" policy (orders are written only by
--    the service-role API), admin read access to addresses, is_admin() hardening
-- 5. Cleanup: stale Shopify-era table + stale storage policies for a bucket
--    that no longer exists
--
-- Additive and safe to run on production while checkout is disabled.
-- =============================================================================

-- =====================
-- 1. ORDERS: payment + checkout columns
-- =====================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_email             TEXT,         -- guest_email or auth email at order time (admin visibility)
  ADD COLUMN IF NOT EXISTS subtotal                   NUMERIC,
  ADD COLUMN IF NOT EXISTS discount_code              TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount            NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_provider           TEXT,         -- 'payplus'
  ADD COLUMN IF NOT EXISTS payment_page_request_uid   TEXT,         -- PayPlus page_request_uid of the generated link
  ADD COLUMN IF NOT EXISTS payment_page_link          TEXT,         -- hosted page URL (reused while still valid)
  ADD COLUMN IF NOT EXISTS payment_link_created_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_transaction_id    TEXT,         -- PayPlus transaction uid
  ADD COLUMN IF NOT EXISTS payment_status_raw         TEXT,         -- provider status_code ('000' = approved)
  ADD COLUMN IF NOT EXISTS payment_method             TEXT,         -- credit-card / bit / apple-pay / google-pay
  ADD COLUMN IF NOT EXISTS paid_amount                NUMERIC,
  ADD COLUMN IF NOT EXISTS paid_currency              TEXT,
  ADD COLUMN IF NOT EXISTS paid_at                    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS card_brand                 TEXT,
  ADD COLUMN IF NOT EXISTS card_last4                 TEXT,
  ADD COLUMN IF NOT EXISTS approval_number            TEXT,
  ADD COLUMN IF NOT EXISTS payment_raw                JSONB,        -- last verified callback/IPN payload (never PAN/CVV)
  ADD COLUMN IF NOT EXISTS payment_attempts           INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expires_at                 TIMESTAMPTZ,  -- abandoned-order cleanup horizon
  ADD COLUMN IF NOT EXISTS cancelled_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;

-- The Lovable-era orders table was created without CHECK constraints on the
-- status columns; add them now (includes the new 'failed'/'cancelled' states).
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_financial_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_financial_status_check
  CHECK (financial_status IN ('pending','paid','failed','cancelled','refunded')) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT orders_financial_status_check;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_fulfillment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_status_check
  CHECK (fulfillment_status IN ('unfulfilled','shipped','delivered')) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT orders_fulfillment_status_check;

CREATE UNIQUE INDEX IF NOT EXISTS orders_provider_txn_uidx
  ON orders (payment_provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_page_request_idx ON orders (payment_page_request_uid);
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders (financial_status, created_at DESC);

-- =====================
-- 2. PAYMENT EVENTS: append-only provider-callback log
-- =====================
CREATE TABLE IF NOT EXISTS payment_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  provider    TEXT NOT NULL,
  event_key   TEXT NOT NULL,               -- transaction_uid:status_code (idempotency key)
  event_type  TEXT,                        -- Charge / Refund / Approval / return-ipn
  status_code TEXT,
  amount      NUMERIC,
  currency    TEXT,
  verified    BOOLEAN NOT NULL DEFAULT false,
  payload     JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, event_key)
);

ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin read payment_events" ON payment_events;
CREATE POLICY "Admin read payment_events" ON payment_events
  FOR SELECT USING (is_admin());
-- No INSERT/UPDATE/DELETE policies on purpose: service role only.

-- =====================
-- 3. ATOMIC pending -> paid TRANSITION
-- =====================
CREATE OR REPLACE FUNCTION public.mark_order_paid(
  p_order_id         UUID,
  p_provider         TEXT,
  p_txn_id           TEXT,
  p_page_request_uid TEXT,
  p_amount           NUMERIC,
  p_currency         TEXT,
  p_status_raw       TEXT,
  p_method           TEXT,
  p_card_brand       TEXT,
  p_card_last4       TEXT,
  p_approval         TEXT,
  p_raw              JSONB
) RETURNS TABLE (updated BOOLEAN, order_number INTEGER, customer_email TEXT, user_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r orders%ROWTYPE;
BEGIN
  SELECT * INTO r FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order % not found', p_order_id;
  END IF;

  IF r.financial_status = 'paid' THEN
    -- Idempotent replay: report success without re-running side effects.
    RETURN QUERY SELECT false, r.order_number, r.customer_email, r.user_id;
    RETURN;
  END IF;

  IF r.financial_status <> 'pending' THEN
    RAISE EXCEPTION 'invalid transition % -> paid for order %', r.financial_status, p_order_id;
  END IF;

  -- The callback must belong to the payment link we generated for this order.
  IF r.payment_page_request_uid IS NOT NULL
     AND p_page_request_uid IS NOT NULL
     AND r.payment_page_request_uid <> p_page_request_uid THEN
    RAISE EXCEPTION 'page_request_uid mismatch for order %', p_order_id;
  END IF;

  IF r.currency_code <> p_currency OR round(r.total_price::numeric, 2) <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'amount mismatch for order %: expected % %, got % %',
      p_order_id, r.total_price, r.currency_code, p_amount, p_currency;
  END IF;

  UPDATE orders SET
    financial_status        = 'paid',
    paid_at                 = now(),
    payment_provider        = p_provider,
    provider_transaction_id = p_txn_id,
    paid_amount             = p_amount,
    paid_currency           = p_currency,
    payment_status_raw      = p_status_raw,
    payment_method          = COALESCE(p_method, payment_method),
    card_brand              = p_card_brand,
    card_last4              = p_card_last4,
    approval_number         = p_approval,
    payment_raw             = p_raw
  WHERE id = p_order_id;

  -- Decrement inventory for tracked products only (inventory_quantity IS NOT NULL).
  UPDATE products p SET inventory_quantity = p.inventory_quantity - li.qty
  FROM (
    SELECT (i->>'product_id')::uuid AS product_id, SUM((i->>'quantity')::int) AS qty
    FROM jsonb_array_elements(r.line_items) i
    GROUP BY 1
  ) li
  WHERE p.id = li.product_id AND p.inventory_quantity IS NOT NULL;

  RETURN QUERY SELECT true, r.order_number, r.customer_email, r.user_id;
END $$;

-- PostgREST exposes public functions as RPC; keep this one service-role only.
REVOKE ALL ON FUNCTION public.mark_order_paid(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB)
  FROM PUBLIC, anon, authenticated;

-- =====================
-- 4. SECURITY HARDENING
-- =====================

-- Orders are inserted exclusively by the service-role API (/api/create-order);
-- the storefront never inserts directly. This policy let anyone with the anon
-- key insert arbitrary rows — including financial_status='paid'.
DROP POLICY IF EXISTS "Insert orders" ON orders;

-- The admin order screen needs to see customers' saved addresses.
DROP POLICY IF EXISTS "Admin read addresses" ON addresses;
CREATE POLICY "Admin read addresses" ON addresses
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

-- is_admin(): pin search_path (SECURITY DEFINER best practice) and mark STABLE
-- so policies don't re-evaluate it per row.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- =====================
-- 5. CLEANUP
-- =====================

-- Shopify-era table, unused since the 2026-04 decoupling.
DROP TABLE IF EXISTS unlinked_orders;

-- Policies for the deleted 'videos' bucket (they allowed ANY authenticated user
-- to upload/delete). The bucket no longer exists; remove the stale policies.
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete videos" ON storage.objects;
DROP POLICY IF EXISTS "Public video access" ON storage.objects;
