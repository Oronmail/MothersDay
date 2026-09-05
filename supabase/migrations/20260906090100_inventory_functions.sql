-- =============================================================================
-- Inventory, part 2/3: functions and triggers
-- Spec §4.3, §4.4, §4.5. inv_apply() is the ONLY writer of on_hand and the ledger.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.inv_apply(
  p_variant_id UUID,
  p_supply_id  UUID,
  p_delta      INTEGER,
  p_set_to     INTEGER,
  p_reason     TEXT,
  p_order_id   UUID DEFAULT NULL,
  p_reference  TEXT DEFAULT NULL,
  p_note       TEXT DEFAULT NULL,
  p_actor      UUID DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current   INTEGER;
  v_delta     INTEGER;
  v_after     INTEGER;
  v_threshold INTEGER;
  v_default   INTEGER;
  v_id        BIGINT;
  v_is_bundle BOOLEAN;
BEGIN
  IF (p_variant_id IS NULL) = (p_supply_id IS NULL) THEN
    RAISE EXCEPTION 'inv_apply: exactly one of variant or supply is required';
  END IF;
  IF p_reason IS NULL THEN
    RAISE EXCEPTION 'inv_apply: reason is required';
  END IF;
  IF p_delta IS NULL AND p_set_to IS NULL THEN
    RAISE EXCEPTION 'inv_apply: delta or set_to is required';
  END IF;

  v_default := COALESCE(
    (SELECT (value #>> '{}')::int FROM store_settings WHERE key = 'low_stock_threshold_default'), 5);

  -- Idempotent replays for order-driven rows (the unique indexes back this up).
  IF p_order_id IS NOT NULL AND p_reason IN ('sale', 'return', 'consume') THEN
    IF EXISTS (
      SELECT 1 FROM inventory_movements m
      WHERE m.order_id = p_order_id AND m.reason = p_reason
        AND m.variant_id IS NOT DISTINCT FROM p_variant_id
        AND m.supply_id  IS NOT DISTINCT FROM p_supply_id
    ) THEN
      RETURN NULL;
    END IF;
  END IF;

  IF p_variant_id IS NOT NULL THEN
    SELECT p.is_bundle INTO v_is_bundle
    FROM product_variants v JOIN products p ON p.id = v.product_id
    WHERE v.id = p_variant_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'inv_apply: variant % not found', p_variant_id;
    END IF;
    IF v_is_bundle THEN
      RAISE EXCEPTION 'inv_apply: kits are never stocked (variant %)', p_variant_id;
    END IF;

    -- Order-driven movements never start tracking an untracked variant.
    IF p_reason IN ('sale', 'return')
       AND NOT EXISTS (SELECT 1 FROM inventory_levels WHERE variant_id = p_variant_id) THEN
      RETURN NULL;
    END IF;

    INSERT INTO inventory_levels (variant_id) VALUES (p_variant_id)
    ON CONFLICT (variant_id) DO NOTHING;

    SELECT on_hand, COALESCE(low_stock_threshold, v_default)
    INTO v_current, v_threshold
    FROM inventory_levels WHERE variant_id = p_variant_id FOR UPDATE;
  ELSE
    SELECT on_hand, COALESCE(low_stock_threshold, v_default)
    INTO v_current, v_threshold
    FROM packaging_supplies WHERE id = p_supply_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'inv_apply: supply % not found', p_supply_id;
    END IF;
  END IF;

  v_delta := COALESCE(p_delta, p_set_to - v_current);
  IF v_delta = 0 THEN
    RETURN NULL;
  END IF;
  v_after := v_current + v_delta;

  PERFORM set_config('inv.allow_on_hand', 'on', true);
  IF p_variant_id IS NOT NULL THEN
    UPDATE inventory_levels
    SET on_hand = v_after,
        low_stock_alerted_at = CASE WHEN v_after > v_threshold THEN NULL ELSE low_stock_alerted_at END
    WHERE variant_id = p_variant_id;
  ELSE
    UPDATE packaging_supplies
    SET on_hand = v_after,
        low_stock_alerted_at = CASE WHEN v_after > v_threshold THEN NULL ELSE low_stock_alerted_at END
    WHERE id = p_supply_id;
  END IF;
  PERFORM set_config('inv.allow_on_hand', 'off', true);

  INSERT INTO inventory_movements
    (variant_id, supply_id, delta, on_hand_after, reason, order_id, reference, note, created_by)
  VALUES
    (p_variant_id, p_supply_id, v_delta, v_after, p_reason, p_order_id, p_reference, p_note, p_actor)
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.inv_apply(UUID,UUID,INTEGER,INTEGER,TEXT,UUID,TEXT,TEXT,UUID)
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Line explosion: [{product_id, variant_id, quantity}] → per-variant quantities.
-- Kits become their components (bundle_items.variant_id, else the component's
-- first variant). Lines pointing at a deleted variant are dropped.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.explode_stock_lines(p_items JSONB)
RETURNS TABLE (variant_id UUID, qty INTEGER)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH items AS (
    SELECT NULLIF(i->>'product_id', '')::uuid AS product_id,
           NULLIF(i->>'variant_id', '')::uuid AS variant_id,
           GREATEST(COALESCE((i->>'quantity')::int, 1), 0) AS quantity
    FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) i
  ),
  lines AS (
    SELECT it.variant_id, it.quantity AS qty
    FROM items it JOIN products p ON p.id = it.product_id
    WHERE NOT p.is_bundle AND it.variant_id IS NOT NULL
    UNION ALL
    SELECT COALESCE(bi.variant_id,
             (SELECT pv.id FROM product_variants pv WHERE pv.product_id = bi.product_id
              ORDER BY pv.sort_order, pv.created_at LIMIT 1)),
           COALESCE(bi.quantity, 1) * it.quantity
    FROM items it
    JOIN products p ON p.id = it.product_id
    JOIN bundle_items bi ON bi.bundle_id = p.id
    WHERE p.is_bundle
  )
  SELECT l.variant_id, SUM(l.qty)::int
  FROM lines l JOIN product_variants v ON v.id = l.variant_id
  WHERE l.qty > 0
  GROUP BY l.variant_id
$$;

CREATE OR REPLACE FUNCTION public.order_stock_lines(p_order_id UUID)
RETURNS TABLE (variant_id UUID, qty INTEGER)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT e.variant_id, e.qty
  FROM explode_stock_lines((SELECT o.line_items FROM orders o WHERE o.id = p_order_id)) e
$$;

CREATE OR REPLACE FUNCTION public.order_total_units(p_order_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(SUM(qty), 0)::int FROM order_stock_lines(p_order_id)
$$;

REVOKE ALL ON FUNCTION public.explode_stock_lines(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.order_stock_lines(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.order_total_units(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.explode_stock_lines(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.order_stock_lines(UUID) TO authenticated;   -- RLS on orders applies (not SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.order_total_units(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Order trigger: paid → sale; paid → cancelled/refunded while unfulfilled → return.
-- Fires for the PayPlus callback, the dev simulator and the admin status select alike.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_order_inventory()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  IF NEW.financial_status = 'paid' AND OLD.financial_status IS DISTINCT FROM 'paid' THEN
    FOR r IN SELECT variant_id, qty FROM order_stock_lines(NEW.id) LOOP
      PERFORM inv_apply(r.variant_id, NULL, -r.qty, NULL, 'sale', NEW.id, NULL, NULL, NULL);
    END LOOP;
  ELSIF NEW.financial_status IN ('cancelled', 'refunded')
        AND OLD.financial_status = 'paid'
        AND NEW.fulfillment_status = 'unfulfilled' THEN
    -- Negate this order's own sale movements, not the current kit recipe.
    FOR r IN SELECT variant_id, delta FROM inventory_movements
             WHERE order_id = NEW.id AND reason = 'sale' AND variant_id IS NOT NULL LOOP
      PERFORM inv_apply(r.variant_id, NULL, -r.delta, NULL, 'return', NEW.id, NULL,
                        'החזרה אוטומטית: ההזמנה בוטלה לפני משלוח', NULL);
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS orders_inventory ON orders;
CREATE TRIGGER orders_inventory
  AFTER UPDATE OF financial_status ON orders
  FOR EACH ROW WHEN (OLD.financial_status IS DISTINCT FROM NEW.financial_status)
  EXECUTE FUNCTION apply_order_inventory();

-- ---------------------------------------------------------------------------
-- Supplies trigger: → shipped consumes active packaging supplies.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_order_supplies()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s RECORD; v_units INTEGER; v_delta INTEGER;
BEGIN
  IF NEW.fulfillment_status = 'shipped' AND OLD.fulfillment_status IS DISTINCT FROM 'shipped' THEN
    v_units := order_total_units(NEW.id);
    FOR s IN SELECT id, consumption_mode, quantity_per_use FROM packaging_supplies
             WHERE is_active AND consumption_mode <> 'manual' LOOP
      v_delta := -(s.quantity_per_use * CASE s.consumption_mode WHEN 'per_order' THEN 1 ELSE v_units END);
      IF v_delta <> 0 THEN
        PERFORM inv_apply(NULL, s.id, v_delta, NULL, 'consume', NEW.id, NULL, NULL, NULL);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS orders_supplies ON orders;
CREATE TRIGGER orders_supplies
  AFTER UPDATE OF fulfillment_status ON orders
  FOR EACH ROW WHEN (OLD.fulfillment_status IS DISTINCT FROM NEW.fulfillment_status)
  EXECUTE FUNCTION apply_order_supplies();

-- ---------------------------------------------------------------------------
-- Admin RPC: one atomic batch of movements. Counts pass set_to; the delta is
-- computed under the row lock inside inv_apply.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_inventory_movements(p_movements JSONB)
RETURNS SETOF BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m JSONB; v_id BIGINT; v_reason TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_movements IS NULL OR jsonb_typeof(p_movements) <> 'array' THEN
    RAISE EXCEPTION 'movements must be a JSON array';
  END IF;
  FOR m IN SELECT * FROM jsonb_array_elements(p_movements) LOOP
    v_reason := m->>'reason';
    IF v_reason IS NULL OR v_reason NOT IN ('return', 'receive', 'count', 'adjust', 'damage', 'gift') THEN
      RAISE EXCEPTION 'reason % is not allowed from the admin', COALESCE(v_reason, 'null');
    END IF;
    v_id := inv_apply(
      NULLIF(m->>'variant_id', '')::uuid,
      NULLIF(m->>'supply_id', '')::uuid,
      (m->>'delta')::int,
      (m->>'set_to')::int,
      v_reason,
      NULLIF(m->>'order_id', '')::uuid,
      NULLIF(m->>'reference', ''),
      NULLIF(m->>'note', ''),
      auth.uid()
    );
    IF v_id IS NOT NULL THEN
      RETURN NEXT v_id;
    END IF;
  END LOOP;
  RETURN;
END $$;

REVOKE ALL ON FUNCTION public.record_inventory_movements(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_inventory_movements(JSONB) TO authenticated;

-- ---------------------------------------------------------------------------
-- mark_order_paid(): identical to 20260901120000 minus the inventory UPDATE —
-- the orders_inventory trigger now does that work for every paid transition.
-- ---------------------------------------------------------------------------
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
    RETURN QUERY SELECT false, r.order_number, r.customer_email, r.user_id;
    RETURN;
  END IF;

  IF r.financial_status <> 'pending' THEN
    RAISE EXCEPTION 'invalid transition % -> paid for order %', r.financial_status, p_order_id;
  END IF;

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

  RETURN QUERY SELECT true, r.order_number, r.customer_email, r.user_id;
END $$;

REVOKE ALL ON FUNCTION public.mark_order_paid(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB)
  FROM PUBLIC, anon, authenticated;

-- The product-level column was never used (NULL on every row) and its grain is wrong.
-- Dropped here, after mark_order_paid() no longer references it.
ALTER TABLE products DROP COLUMN IF EXISTS inventory_quantity;
