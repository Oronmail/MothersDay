-- =============================================================================
-- Inventory hardening (final review of 20260906090000/090100/090200).
-- Additive and idempotent: CREATE OR REPLACE, ALTER VIEW SET, REVOKE/GRANT.
--   1. Exact stock is never public (spec §12, decision 4): the two internal
--      availability views lose their anon/authenticated grants; the storefront
--      keeps reading storefront_availability, which chains through them with
--      owner rights.
--   2. security_barrier on the staff views.
--   3. NULL-safe is_bundle / available_for_sale in the availability views.
--   4. Deterministic lock order in the order trigger.
--   5. A nested kit can never reach inv_apply() during a payment.
--   6. SET search_path = public, pg_temp on every SECURITY DEFINER function.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Views: NULL-safe is_bundle / available_for_sale (both columns are nullable).
-- Bodies copied from 20260906090200_inventory_views.sql; only the COALESCE()
-- wrappers differ, so the column lists are unchanged.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.variant_availability AS
SELECT v.id AS variant_id,
       v.product_id,
       (COALESCE(v.available_for_sale, true)
         AND (l.variant_id IS NULL OR l.policy = 'continue' OR (l.on_hand - COALESCE(r.reserved, 0)) > 0)) AS sellable,
       CASE WHEN l.variant_id IS NULL OR l.policy = 'continue' THEN NULL
            ELSE LEAST(GREATEST(l.on_hand - COALESCE(r.reserved, 0), 0), 20) END AS max_orderable
FROM product_variants v
JOIN products p ON p.id = v.product_id
LEFT JOIN inventory_levels l ON l.variant_id = v.id
LEFT JOIN inventory_reserved r ON r.variant_id = v.id
WHERE NOT COALESCE(p.is_bundle, false);

CREATE OR REPLACE VIEW public.storefront_availability AS
SELECT va.product_id, va.variant_id, va.sellable, va.max_orderable
FROM variant_availability va
UNION ALL
SELECT p.id, v.id,
       (COALESCE(v.available_for_sale, true) AND (k.can_build IS NULL OR k.can_build > 0)),
       CASE WHEN k.can_build IS NULL THEN NULL ELSE LEAST(k.can_build, 20) END
FROM products p
JOIN product_variants v ON v.product_id = p.id
LEFT JOIN kit_availability k ON k.bundle_id = p.id
WHERE COALESCE(p.is_bundle, false);

CREATE OR REPLACE VIEW public.variant_stock AS
SELECT v.id AS variant_id, v.product_id,
       p.title AS product_title, p.handle AS product_handle, p.status AS product_status,
       v.title AS variant_title, v.sku, v.available_for_sale,
       (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position LIMIT 1) AS image_url,
       l.on_hand,
       COALESCE(r.reserved, 0) AS reserved,
       l.on_hand - COALESCE(r.reserved, 0) AS available,
       COALESCE(l.low_stock_threshold, d.default_threshold) AS threshold,
       l.low_stock_threshold AS own_threshold,
       l.policy, l.low_stock_alerted_at, l.updated_at,
       (l.variant_id IS NOT NULL) AS is_tracked,
       CASE WHEN l.variant_id IS NULL THEN 'untracked'
            WHEN l.on_hand < 0 THEN 'short'
            WHEN l.on_hand - COALESCE(r.reserved, 0) <= 0 THEN 'out'
            WHEN l.on_hand - COALESCE(r.reserved, 0) <= COALESCE(l.low_stock_threshold, d.default_threshold) THEN 'low'
            ELSE 'ok' END AS status,
       (SELECT max(m.created_at) FROM inventory_movements m WHERE m.variant_id = v.id) AS last_movement_at
FROM product_variants v
JOIN products p ON p.id = v.product_id
LEFT JOIN inventory_levels l ON l.variant_id = v.id
LEFT JOIN inventory_reserved r ON r.variant_id = v.id
CROSS JOIN (SELECT COALESCE((SELECT (value #>> '{}')::int FROM store_settings WHERE key = 'low_stock_threshold_default'), 5) AS default_threshold) d
WHERE NOT COALESCE(p.is_bundle, false) AND is_staff_or_service();

-- Staff views: keep the is_staff_or_service() gate ahead of any user-supplied
-- predicate, so a cheap leaky function in a WHERE clause cannot see other rows.
ALTER VIEW public.variant_stock          SET (security_barrier = true);
ALTER VIEW public.supply_stock           SET (security_barrier = true);
ALTER VIEW public.kit_stock              SET (security_barrier = true);
ALTER VIEW public.inventory_movement_log SET (security_barrier = true);

-- ---------------------------------------------------------------------------
-- explode_stock_lines(): a kit whose component is itself a kit is skipped.
-- Without this, inv_apply() would raise "kits are never stocked" inside the
-- payment callback's mark_order_paid() transaction. Body copied from
-- 20260906090100_inventory_functions.sql; only the p2 join is new.
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
    JOIN products p2 ON p2.id = bi.product_id AND NOT COALESCE(p2.is_bundle, false)
    WHERE p.is_bundle
  )
  SELECT l.variant_id, SUM(l.qty)::int
  FROM lines l JOIN product_variants v ON v.id = l.variant_id
  WHERE l.qty > 0
  GROUP BY l.variant_id
$$;

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER functions: pg_temp pinned last in search_path, so a
-- temporary table can never shadow a public one. Bodies are otherwise verbatim
-- from 20260906090100 / 20260906090200, except apply_order_inventory()'s two
-- ORDER BY variant_id clauses (deterministic lock order → no deadlock between
-- two concurrent payments touching the same parts).
-- ---------------------------------------------------------------------------
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

CREATE OR REPLACE FUNCTION public.apply_order_inventory()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r RECORD;
BEGIN
  IF NEW.financial_status = 'paid' AND OLD.financial_status IS DISTINCT FROM 'paid' THEN
    FOR r IN SELECT variant_id, qty FROM order_stock_lines(NEW.id) ORDER BY variant_id LOOP
      PERFORM inv_apply(r.variant_id, NULL, -r.qty, NULL, 'sale', NEW.id, NULL, NULL, NULL);
    END LOOP;
  ELSIF NEW.financial_status IN ('cancelled', 'refunded')
        AND OLD.financial_status = 'paid'
        AND NEW.fulfillment_status = 'unfulfilled' THEN
    -- Negate this order's own sale movements, not the current kit recipe.
    FOR r IN SELECT variant_id, delta FROM inventory_movements
             WHERE order_id = NEW.id AND reason = 'sale' AND variant_id IS NOT NULL
             ORDER BY variant_id LOOP
      PERFORM inv_apply(r.variant_id, NULL, -r.delta, NULL, 'return', NEW.id, NULL,
                        'החזרה אוטומטית: ההזמנה בוטלה לפני משלוח', NULL);
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.apply_order_supplies()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

CREATE OR REPLACE FUNCTION public.record_inventory_movements(p_movements JSONB)
RETURNS SETOF BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

CREATE OR REPLACE FUNCTION public.check_order_stock(p_items JSONB)
RETURNS TABLE (variant_id UUID, title TEXT, requested INTEGER, available INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT l.variant_id,
         p.title || CASE WHEN v.title IS NULL OR v.title IN ('Default Title', 'ברירת מחדל') THEN '' ELSE ' — ' || v.title END,
         l.qty,
         GREATEST(lv.on_hand - COALESCE(r.reserved, 0), 0)
  FROM explode_stock_lines(p_items) l
  JOIN product_variants v ON v.id = l.variant_id
  JOIN products p ON p.id = v.product_id
  JOIN inventory_levels lv ON lv.variant_id = l.variant_id
  LEFT JOIN inventory_reserved r ON r.variant_id = l.variant_id
  WHERE lv.policy = 'deny' AND (lv.on_hand - COALESCE(r.reserved, 0)) < l.qty
$$;

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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

-- ---------------------------------------------------------------------------
-- Grants. Exact stock is never public (spec §12, decision 4): kit_availability
-- exposes can_build uncapped and variant_availability is only an intermediate,
-- so both drop back to owner-rights use from storefront_availability (which a
-- view reads with the owner's privileges) and from kit_stock. Nothing in src/,
-- api/ or scripts/ selects either view directly.
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.kit_availability, public.variant_availability FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.storefront_availability TO anon, authenticated;

-- Re-issued verbatim after the CREATE OR REPLACEs above (which keep the ACLs,
-- but a fresh database must not depend on that).
REVOKE ALL ON FUNCTION public.inv_apply(UUID,UUID,INTEGER,INTEGER,TEXT,UUID,TEXT,TEXT,UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.explode_stock_lines(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.explode_stock_lines(JSONB) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.record_inventory_movements(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_inventory_movements(JSONB) TO authenticated;
REVOKE ALL ON FUNCTION public.check_order_stock(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_order_paid(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.variant_stock, public.supply_stock, public.kit_stock, public.inventory_movement_log FROM PUBLIC, anon;
GRANT SELECT ON public.variant_stock, public.supply_stock, public.kit_stock, public.inventory_movement_log TO authenticated;
