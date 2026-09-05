-- =============================================================================
-- Inventory, part 1/3: schema
-- Spec: docs/superpowers/specs/2026-09-05-inventory-management-design.md §4.1, §4.1a, §8
-- Stock lives per variant in inventory_levels; every change is a row in the
-- append-only inventory_movements ledger, written only by inv_apply() (part 2).
-- Packaging supplies (boxes, tissue, cards) carry their own on_hand and are
-- consumed when an order ships.
-- =============================================================================

-- One row per tracked variant. No row = untracked = unlimited.
CREATE TABLE IF NOT EXISTS inventory_levels (
  variant_id           UUID PRIMARY KEY REFERENCES product_variants(id) ON DELETE CASCADE,
  on_hand              INTEGER NOT NULL DEFAULT 0,            -- may go negative after a sale
  low_stock_threshold  INTEGER,                               -- NULL = store default
  policy               TEXT NOT NULL DEFAULT 'deny'
                       CHECK (policy IN ('deny', 'continue')), -- continue = keep selling at 0 (pre-order)
  low_stock_alerted_at TIMESTAMPTZ,                           -- cleared when stock rises above threshold
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS packaging_supplies (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  sku                  TEXT UNIQUE,
  on_hand              INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold  INTEGER,
  consumption_mode     TEXT NOT NULL DEFAULT 'per_order'
                       CHECK (consumption_mode IN ('per_order', 'per_item', 'manual')),
  quantity_per_use     INTEGER NOT NULL DEFAULT 1 CHECK (quantity_per_use > 0),
  is_active            BOOLEAN NOT NULL DEFAULT true,
  low_stock_alerted_at TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only. Never updated or deleted; a mistake is reversed by a counter-movement.
CREATE TABLE IF NOT EXISTS inventory_movements (
  id            BIGSERIAL PRIMARY KEY,
  variant_id    UUID REFERENCES product_variants(id),
  supply_id     UUID REFERENCES packaging_supplies(id),
  delta         INTEGER NOT NULL CHECK (delta <> 0),
  on_hand_after INTEGER NOT NULL,
  reason        TEXT NOT NULL CHECK (reason IN
                  ('sale', 'return', 'consume', 'receive', 'count', 'adjust', 'damage', 'gift')),
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  reference     TEXT,
  note          TEXT,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((variant_id IS NULL) <> (supply_id IS NULL))
);

CREATE INDEX IF NOT EXISTS inventory_movements_variant_idx ON inventory_movements (variant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_supply_idx  ON inventory_movements (supply_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_movements_order_idx   ON inventory_movements (order_id);

-- One sale set, one return set, one consume set per order and item: replays are no-ops.
CREATE UNIQUE INDEX IF NOT EXISTS inventory_movements_order_variant_once
  ON inventory_movements (order_id, variant_id, reason)
  WHERE order_id IS NOT NULL AND variant_id IS NOT NULL AND reason IN ('sale', 'return');
CREATE UNIQUE INDEX IF NOT EXISTS inventory_movements_order_supply_once
  ON inventory_movements (order_id, supply_id, reason)
  WHERE order_id IS NOT NULL AND supply_id IS NOT NULL AND reason = 'consume';

-- Kits may pin a component variant (needed only for multi-variant components).
ALTER TABLE bundle_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

-- Owners' new-order email, sent once per paid order.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_notified_at TIMESTAMPTZ;

-- Reservation view scans pending, unexpired orders.
CREATE INDEX IF NOT EXISTS orders_pending_expiry_idx ON orders (financial_status, expires_at);

-- SKUs are unique when present (labels, counts, HFD orderItems later).
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_sku_uidx ON product_variants (sku) WHERE sku IS NOT NULL;

-- ---------------------------------------------------------------------------
-- on_hand may only move through inv_apply(), which sets a transaction-local flag.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inv_guard_on_hand()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.on_hand IS DISTINCT FROM OLD.on_hand
     AND current_setting('inv.allow_on_hand', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'on_hand changes only through inventory movements';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_on_hand ON inventory_levels;
CREATE TRIGGER guard_on_hand BEFORE UPDATE ON inventory_levels
  FOR EACH ROW EXECUTE FUNCTION inv_guard_on_hand();
DROP TRIGGER IF EXISTS guard_on_hand ON packaging_supplies;
CREATE TRIGGER guard_on_hand BEFORE UPDATE ON packaging_supplies
  FOR EACH ROW EXECUTE FUNCTION inv_guard_on_hand();

-- ---------------------------------------------------------------------------
-- RLS: admins read everything; admins may edit threshold/policy and supply
-- metadata (on_hand is guarded above); nobody inserts movements directly.
-- ---------------------------------------------------------------------------
ALTER TABLE inventory_levels    ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_supplies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read inventory_levels"   ON inventory_levels;
DROP POLICY IF EXISTS "Admin update inventory_levels" ON inventory_levels;
CREATE POLICY "Admin read inventory_levels"   ON inventory_levels FOR SELECT USING (is_admin());
CREATE POLICY "Admin update inventory_levels" ON inventory_levels FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin read packaging_supplies"   ON packaging_supplies;
DROP POLICY IF EXISTS "Admin insert packaging_supplies" ON packaging_supplies;
DROP POLICY IF EXISTS "Admin update packaging_supplies" ON packaging_supplies;
DROP POLICY IF EXISTS "Admin delete packaging_supplies" ON packaging_supplies;
CREATE POLICY "Admin read packaging_supplies"   ON packaging_supplies FOR SELECT USING (is_admin());
CREATE POLICY "Admin insert packaging_supplies" ON packaging_supplies FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update packaging_supplies" ON packaging_supplies FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete packaging_supplies" ON packaging_supplies FOR DELETE USING (is_admin());

DROP POLICY IF EXISTS "Admin read inventory_movements" ON inventory_movements;
CREATE POLICY "Admin read inventory_movements" ON inventory_movements FOR SELECT USING (is_admin());
-- No INSERT/UPDATE/DELETE policies on inventory_movements on purpose.

-- ---------------------------------------------------------------------------
-- Settings (alert recipients live in the ORDER_ALERT_EMAILS env var, not here:
-- store_settings is public-read).
-- ---------------------------------------------------------------------------
INSERT INTO store_settings (key, value) VALUES
  ('low_stock_threshold_default', '5'::jsonb),
  ('inventory_reserve_pending', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- SKUs (spec §4.1a). Matched by product handle; the board by variant title too.
-- ---------------------------------------------------------------------------
UPDATE product_variants v
SET sku = m.sku
FROM (VALUES
  ('בלוק-תכנון-גדול',    NULL,                     'BLK-L'),
  ('בלוק-תכנון-בינוני',  NULL,                     'BLK-M'),
  ('בלוק-תכנון-קטן',     NULL,                     'BLK-S'),
  ('מחברת-שורות-גדולה',  NULL,                     'NB-M'),   -- handle says גדולה, title is בינונית
  ('מחברת-שורות-קטנה',   NULL,                     'NB-S'),
  ('מחברת-יום-האם',      NULL,                     'NB-TASKS'),
  ('לוח-שבועי',          NULL,                     'WB'),
  ('תכנון-ארוחות-שבועי', NULL,                     'MEAL'),
  ('רשימת-קניות',        NULL,                     'LIST'),
  ('לוח-משפחתי-שבועי',   'כולל מסגרת עץ מגנטית',   'FB-FRAME'),
  ('לוח-משפחתי-שבועי',   'ריפיל — דפים בלבד',      'FB-REFILL')
) AS m(handle, variant_title, sku)
JOIN products p ON p.handle = m.handle
WHERE v.product_id = p.id
  AND (m.variant_title IS NULL OR v.title = m.variant_title)
  AND v.sku IS NULL;
