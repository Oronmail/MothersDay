-- Damage movements must be idempotent per order+variant, same as sale/return.
--
-- Why: OrderRestockDialog (admin order card, manual return after shipping) writes
-- a `return` (+qty) followed by a `damage` (−qty) for a damaged item, both stamped
-- with the order id. If the admin's browser drops the response and retries, the
-- `return` leg is already suppressed by inv_apply's own idempotency check — but
-- `damage` was never in that check's reason list, so the retry would apply a second
-- −qty movement and permanently understate stock with no error surfaced to the admin.
--
-- Fix: extend both idempotency mechanisms (the partial unique index, and inv_apply's
-- pre-insert EXISTS check) to also cover `damage`.

DROP INDEX IF EXISTS inventory_movements_order_variant_once;
CREATE UNIQUE INDEX IF NOT EXISTS inventory_movements_order_variant_once
  ON inventory_movements (order_id, variant_id, reason)
  WHERE order_id IS NOT NULL AND variant_id IS NOT NULL AND reason IN ('sale', 'return', 'damage');

-- Body copied verbatim from 20260906120000_inventory_hardening.sql; only the
-- idempotency reason list changes (sale/return/consume → + damage).
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
  IF p_order_id IS NOT NULL AND p_reason IN ('sale', 'return', 'consume', 'damage') THEN
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

-- Re-issued verbatim (CREATE OR REPLACE keeps the ACLs, but a fresh database must not depend on that).
REVOKE ALL ON FUNCTION public.inv_apply(UUID,UUID,INTEGER,INTEGER,TEXT,UUID,TEXT,TEXT,UUID)
  FROM PUBLIC, anon, authenticated;
