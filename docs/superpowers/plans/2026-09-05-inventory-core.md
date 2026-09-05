# Inventory Core (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track stock per variant in a Supabase ledger, keep it correct through every order transition with database triggers, stop overselling at order time, derive kit availability from parts, email the owners on every paid order, and give the admin a stock overview with a movements log.

**Architecture:** Three migrations add `inventory_levels`, `packaging_supplies` and the append-only `inventory_movements` ledger; one function `inv_apply()` is the only writer; two triggers on `orders` (financial_status → sale/return, fulfillment_status → consume) drive all order-side stock changes; owner-rights views expose `sellable`/`max_orderable` publicly and full stock to admins. The Vercel API gains a stock check in `create-order` and an owners' email in the paid path. The storefront reads one public view; the admin gets `/admin/inventory` and `/admin/inventory/movements`.

**Tech Stack:** Postgres 17 (Supabase) with plpgsql, Supabase CLI `db push`, Vercel Node functions (TypeScript, ESM with `.js` import suffixes), React 18 + TanStack Query + shadcn/ui, Zod, Resend REST, Vitest (added in Task 4).

**Spec:** `docs/superpowers/specs/2026-09-05-inventory-management-design.md` — read sections 4, 5, 6, 7.1, 7.4, 7.6, 8 and 10 before starting.

## Global Constraints

- All customer- and admin-facing copy is Hebrew (RTL). Code identifiers and comments are English.
- Never commit secrets. `.env` stays untracked. Server env vars are set in Vercel (Development, Preview, Production).
- Anything that writes orders, payments or stock runs server-side (service role, SECURITY DEFINER function, or trigger). The admin browser client only calls `record_inventory_movements` and updates `inventory_levels` threshold/policy and `packaging_supplies` metadata.
- Kits (`products.is_bundle = true`) are never stocked; `inv_apply()` refuses them.
- Exact stock numbers never reach a customer: the storefront reads only `storefront_availability` (`sellable`, `max_orderable`).
- Per-line quantity cap stays `MAX_ITEM_QUANTITY = 20` (`src/lib/checkoutConfig.ts`); `max_orderable` is capped at 20 too.
- Owner alert recipients come from the env var `ORDER_ALERT_EMAILS` (comma-separated). Set it to `eden@mothersday.co.il,oron@mothersday.co.il` in all Vercel environments and in local `.env`. Not stored in `store_settings` (that table is public-read).
- Default low-stock threshold: 5 (`store_settings.low_stock_threshold_default`).
- Migration workflow (memory `project-supabase-direct-access`): write the file under `supabase/migrations/`, then
  `SUPABASE_DB_PASSWORD=$(security find-generic-password -s mothersday-supabase-db -w) supabase db push`.
  There is no local Docker; SQL tests run against the linked database inside `BEGIN … ROLLBACK`. Checkout is disabled in production and the orders table holds only test orders, so this is acceptable; keep every test script rolled back.
- psql connection (used by test steps):
  `PGPASSWORD=$(security find-generic-password -s mothersday-supabase-db -w) psql "host=aws-1-ap-northeast-1.pooler.supabase.com port=5432 user=postgres.yptpcpxyefboptosfxkh dbname=postgres sslmode=require" -v ON_ERROR_STOP=1`
  Referred to below as `$PSQL`. Define it once per shell: `PSQL='psql "host=aws-1-ap-northeast-1.pooler.supabase.com port=5432 user=postgres.yptpcpxyefboptosfxkh dbname=postgres sslmode=require" -v ON_ERROR_STOP=1'` and prefix each call with `PGPASSWORD=$(security find-generic-password -s mothersday-supabase-db -w)`.
- TypeScript checks: `npx tsc --noEmit -p tsconfig.app.json` (frontend) and `npx tsc --noEmit -p tsconfig.node.json` (scripts). The repo has pre-existing errors; the rule is **no new errors in files you touched** — filter with `| grep <file>`.
- Lint only the files you touched: `npx eslint <files>`.
- Commit after every task on branch `launch/payplus`. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/20260906090000_inventory_schema.sql` | Create | Tables (`inventory_levels`, `packaging_supplies`, `inventory_movements`), columns (`bundle_items.variant_id`, `orders.admin_notified_at`), indexes, on_hand guard trigger, RLS, settings seeds, SKU data, drop `products.inventory_quantity` |
| `supabase/migrations/20260906090100_inventory_functions.sql` | Create | `inv_apply`, `explode_stock_lines`, `order_stock_lines`, `order_total_units`, order triggers, `record_inventory_movements`, `mark_order_paid` without inventory code |
| `supabase/migrations/20260906090200_inventory_views.sql` | Create | `is_staff_or_service`, `inventory_reserved`, `variant_availability`, `kit_availability`, `storefront_availability`, `variant_stock`, `kit_stock`, `supply_stock`, `inventory_movement_log`, `check_order_stock`, grants |
| `supabase/tests/inventory_scenarios.sql` | Create | Rolled-back scenario assertions for the ledger, triggers and views |
| `vitest.config.ts`, `package.json` | Create / Modify | Vitest for pure TypeScript helpers (`npm test`) |
| `api/_lib/inventory.ts` (+ `.test.ts`) | Create | Server helpers: `checkOrderStock`, `formatShortageMessage`, `parseAlertEmails`, `collectLowStockForOrder`, `collectLowStockSupplies`, `stampLowStockAlerted` |
| `api/create-order.ts` | Modify | Stock check → HTTP 409 `insufficient_stock` |
| `api/_lib/newOrderAdminEmail.ts` (+ `.test.ts`) | Create | Owners' new-order email (text + HTML + send) with optional low-stock section |
| `api/_lib/orderPayment.ts` | Modify | `notifyOwnersOfPaidOrder()` — builds payload, sends once, stamps `admin_notified_at` and low-stock alerts |
| `api/payplus-callback.ts`, `api/payplus-return.ts`, `api/simulate-payment.ts` | Modify | Call `notifyOwnersOfPaidOrder()` after the customer email |
| `src/lib/availability.ts` (+ `.test.ts`) | Create | `fetchAvailability()` (public view, fails open) and pure `applyAvailability()` |
| `src/lib/types.ts` | Modify | `ProductVariant.maxOrderable` |
| `src/lib/api.ts` | Modify | Apply availability in `toProductEdgesWithBundles` and `getProductByHandle`; `insufficient_stock` passes through `CheckoutApiError` |
| `src/hooks/useAddToCart.ts`, `src/pages/ProductDetail.tsx`, `src/components/QuickViewModal.tsx` | Modify | Quantity stepper capped at `maxOrderable` |
| `src/components/CartDrawer.tsx`, `src/components/checkout/CheckoutSummary.tsx` | Modify | `+` button capped at `maxOrderable`; checkout clamps quantities from live availability |
| `src/pages/Checkout.tsx` | Modify | Hebrew message for `insufficient_stock` |
| `scripts/prerender-seo.ts` | Modify | InStock/OutOfStock from `storefront_availability` |
| `src/components/admin/adminInventory.ts` (+ `.test.ts`) | Create | Row types, status badges, reason labels, `recordMovements()` RPC wrapper |
| `src/components/admin/InventoryAdjustDialog.tsx` | Create | קליטה / ספירה / התאמה dialog for one item |
| `src/components/admin/InventoryOverview.tsx` | Create | `/admin/inventory`: products table, supplies table, kits grid, filters |
| `src/components/admin/InventoryMovements.tsx` | Create | `/admin/inventory/movements`: filterable ledger + CSV export |
| `src/components/admin/AdminSidebar.tsx`, `src/pages/AdminDashboard.tsx` | Modify | מלאי nav entry and routes |
| `src/components/admin/ProductForm.tsx` | Modify | Remove product-level מלאי; per-variant stock display, threshold, policy, "עדכון מלאי" |
| `CLAUDE.md` | Modify | Inventory section |

---

### Task 1: Schema migration

**Files:**
- Create: `supabase/migrations/20260906090000_inventory_schema.sql`

**Interfaces:**
- Produces: tables `inventory_levels(variant_id PK, on_hand, low_stock_threshold, policy, low_stock_alerted_at, updated_at)`, `packaging_supplies(id, name, sku, on_hand, low_stock_threshold, consumption_mode, quantity_per_use, is_active, low_stock_alerted_at, created_at, updated_at)`, `inventory_movements(id, variant_id, supply_id, delta, on_hand_after, reason, order_id, reference, note, created_by, created_at)`; columns `bundle_items.variant_id`, `orders.admin_notified_at`; trigger function `inv_guard_on_hand()` that blocks `on_hand` changes unless the transaction-local setting `inv.allow_on_hand` is `'on'`; settings keys `low_stock_threshold_default`, `inventory_reserve_pending`; variant SKUs.

- [ ] **Step 1: Write the migration**

```sql
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

-- The product-level column was never used (NULL on every row) and its grain is wrong.
ALTER TABLE products DROP COLUMN IF EXISTS inventory_quantity;
```

- [ ] **Step 2: Push the migration**

Run:
```bash
SUPABASE_DB_PASSWORD=$(security find-generic-password -s mothersday-supabase-db -w) supabase db push
```
Expected: the CLI lists `20260906090000_inventory_schema.sql` and finishes with "Finished supabase db push". If it says "Cannot find project ref", re-link first (see Global Constraints memory note), then push again.

- [ ] **Step 3: Verify the schema**

Run:
```bash
PGPASSWORD=$(security find-generic-password -s mothersday-supabase-db -w) $PSQL <<'SQL'
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM information_schema.tables WHERE table_schema='public'
          AND table_name IN ('inventory_levels','packaging_supplies','inventory_movements')) = 3, 'tables missing';
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bundle_items' AND column_name='variant_id'), 'bundle_items.variant_id missing';
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='admin_notified_at'), 'orders.admin_notified_at missing';
  ASSERT NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='inventory_quantity'), 'products.inventory_quantity still exists';
  ASSERT (SELECT count(*) FROM product_variants WHERE sku IS NOT NULL) = 11, format('expected 11 SKUs, got %s', (SELECT count(*) FROM product_variants WHERE sku IS NOT NULL));
  ASSERT (SELECT value #>> '{}' FROM store_settings WHERE key='low_stock_threshold_default') = '5', 'threshold seed missing';
END $$;
SELECT p.handle, v.title, v.sku FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.sku IS NOT NULL ORDER BY v.sku;
SQL
```
Expected: `DO` with no error, then 11 rows (BLK-L … WB).

- [ ] **Step 4: Verify the on_hand guard**

Run:
```bash
PGPASSWORD=$(security find-generic-password -s mothersday-supabase-db -w) $PSQL <<'SQL'
BEGIN;
INSERT INTO packaging_supplies (name, sku) VALUES ('guard-test', 'TEST-GUARD');
DO $$
BEGIN
  BEGIN
    UPDATE packaging_supplies SET on_hand = 5 WHERE sku = 'TEST-GUARD';
    RAISE EXCEPTION 'guard did not fire';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'on_hand changes only%' THEN RAISE; END IF;
  END;
  PERFORM set_config('inv.allow_on_hand', 'on', true);
  UPDATE packaging_supplies SET on_hand = 5 WHERE sku = 'TEST-GUARD';
  ASSERT (SELECT on_hand FROM packaging_supplies WHERE sku='TEST-GUARD') = 5, 'flagged update failed';
END $$;
ROLLBACK;
SQL
```
Expected: `BEGIN`, `INSERT 0 1`, `DO`, `ROLLBACK` — no error text.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260906090000_inventory_schema.sql
git commit -m "Inventory: schema — levels, supplies, movements ledger, SKUs

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Ledger functions, order triggers, admin RPC

**Files:**
- Create: `supabase/migrations/20260906090100_inventory_functions.sql`
- Create: `supabase/tests/inventory_scenarios.sql`

**Interfaces:**
- Consumes: Task 1 tables and `inv_guard_on_hand()`.
- Produces:
  - `inv_apply(p_variant_id UUID, p_supply_id UUID, p_delta INT, p_set_to INT, p_reason TEXT, p_order_id UUID, p_reference TEXT, p_note TEXT, p_actor UUID) RETURNS BIGINT` — the only writer; returns the movement id or NULL when nothing was written.
  - `explode_stock_lines(p_items JSONB) RETURNS TABLE(variant_id UUID, qty INT)` — `[{product_id, variant_id, quantity}]` → per-variant quantities, kits exploded.
  - `order_stock_lines(p_order_id UUID) RETURNS TABLE(variant_id UUID, qty INT)`, `order_total_units(p_order_id UUID) RETURNS INT`.
  - Triggers `orders_inventory` (financial_status) and `orders_supplies` (fulfillment_status).
  - RPC `record_inventory_movements(p_movements JSONB) RETURNS SETOF BIGINT` — admin only; elements `{variant_id | supply_id, delta | set_to, reason, order_id?, reference?, note?}`; reasons limited to `return, receive, count, adjust, damage, gift`.
  - `mark_order_paid(...)` with the inventory UPDATE removed (same signature).

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Write the scenario test (rolled back)**

`supabase/tests/inventory_scenarios.sql`:

```sql
-- Inventory ledger scenarios. Everything runs inside one transaction and is
-- rolled back, so it is safe against the linked database.
-- Run: PGPASSWORD=... psql "<conn>" -v ON_ERROR_STOP=1 -f supabase/tests/inventory_scenarios.sql
BEGIN;

DO $$
DECLARE
  p_a UUID; p_b UUID; p_c UUID; p_k UUID;
  v_a UUID; v_b UUID; v_c UUID; v_k UUID;
  s_box UUID; s_card UUID; s_manual UUID;
  o1 UUID; o2 UUID; o3 UUID;
  n INTEGER;
BEGIN
  -- ---- fixture: two tracked parts, one untracked part, one kit (2×A + 1×B) ----
  INSERT INTO products (handle, title, is_bundle, price) VALUES
    ('zz-test-part-a', 'חלק א', false, 10), ('zz-test-part-b', 'חלק ב', false, 10),
    ('zz-test-part-c', 'חלק ג', false, 10), ('zz-test-kit', 'מארז בדיקה', true, 30);
  SELECT id INTO p_a FROM products WHERE handle = 'zz-test-part-a';
  SELECT id INTO p_b FROM products WHERE handle = 'zz-test-part-b';
  SELECT id INTO p_c FROM products WHERE handle = 'zz-test-part-c';
  SELECT id INTO p_k FROM products WHERE handle = 'zz-test-kit';
  INSERT INTO product_variants (product_id, title, price) VALUES
    (p_a, 'Default Title', 10), (p_b, 'Default Title', 10), (p_c, 'Default Title', 10), (p_k, 'Default Title', 30);
  SELECT id INTO v_a FROM product_variants WHERE product_id = p_a;
  SELECT id INTO v_b FROM product_variants WHERE product_id = p_b;
  SELECT id INTO v_c FROM product_variants WHERE product_id = p_c;
  SELECT id INTO v_k FROM product_variants WHERE product_id = p_k;
  INSERT INTO bundle_items (bundle_id, product_id, quantity) VALUES (p_k, p_a, 2), (p_k, p_b, 1);

  -- start tracking A=10, B=5 via counts
  PERFORM inv_apply(v_a, NULL, NULL, 10, 'count', NULL, 'test-count', NULL, NULL);
  PERFORM inv_apply(v_b, NULL, NULL, 5,  'count', NULL, 'test-count', NULL, NULL);
  ASSERT (SELECT on_hand FROM inventory_levels WHERE variant_id = v_a) = 10, 'count A';
  ASSERT (SELECT on_hand_after FROM inventory_movements WHERE variant_id = v_a) = 10, 'on_hand_after A';

  -- kits are refused
  BEGIN
    PERFORM inv_apply(v_k, NULL, 1, NULL, 'receive', NULL, NULL, NULL, NULL);
    RAISE EXCEPTION 'kit was stocked';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'inv_apply: kits are never stocked%' THEN RAISE; END IF;
  END;

  -- zero delta writes nothing
  ASSERT inv_apply(v_a, NULL, NULL, 10, 'count', NULL, NULL, NULL, NULL) IS NULL, 'zero delta wrote a row';

  -- ---- order 1: 1 kit + 1 A → sale A −3, B −1 ----
  INSERT INTO orders (line_items, shipping_address, total_price, currency_code, financial_status, fulfillment_status, expires_at, customer_email)
  VALUES (jsonb_build_array(
            jsonb_build_object('product_id', p_k, 'variant_id', v_k, 'quantity', 1, 'title', 'מארז בדיקה', 'price', '30'),
            jsonb_build_object('product_id', p_a, 'variant_id', v_a, 'quantity', 1, 'title', 'חלק א', 'price', '10')),
          '{}'::jsonb, 40, 'ILS', 'pending', 'unfulfilled', now() + interval '2 hours', 'test@example.com')
  RETURNING id INTO o1;

  ASSERT (SELECT qty FROM order_stock_lines(o1) WHERE variant_id = v_a) = 3, 'explode A';
  ASSERT (SELECT qty FROM order_stock_lines(o1) WHERE variant_id = v_b) = 1, 'explode B';
  ASSERT order_total_units(o1) = 4, 'total units';

  UPDATE orders SET financial_status = 'paid' WHERE id = o1;
  ASSERT (SELECT on_hand FROM inventory_levels WHERE variant_id = v_a) = 7, 'sale A';
  ASSERT (SELECT on_hand FROM inventory_levels WHERE variant_id = v_b) = 4, 'sale B';
  SELECT count(*) INTO n FROM inventory_movements WHERE order_id = o1 AND reason = 'sale';
  ASSERT n = 2, format('expected 2 sale rows, got %s', n);

  -- replay: pending → paid again writes nothing
  UPDATE orders SET financial_status = 'pending' WHERE id = o1;
  UPDATE orders SET financial_status = 'paid' WHERE id = o1;
  ASSERT (SELECT on_hand FROM inventory_levels WHERE variant_id = v_a) = 7, 'replay changed A';

  -- cancel before shipping → automatic return
  UPDATE orders SET financial_status = 'cancelled' WHERE id = o1;
  ASSERT (SELECT on_hand FROM inventory_levels WHERE variant_id = v_a) = 10, 'return A';
  ASSERT (SELECT on_hand FROM inventory_levels WHERE variant_id = v_b) = 5, 'return B';
  SELECT count(*) INTO n FROM inventory_movements WHERE order_id = o1 AND reason = 'return';
  ASSERT n = 2, 'return rows';

  -- ---- supplies ----
  INSERT INTO packaging_supplies (name, sku, consumption_mode) VALUES ('קופסה', 'ZZ-BOX', 'per_order') RETURNING id INTO s_box;
  INSERT INTO packaging_supplies (name, sku, consumption_mode) VALUES ('כרטיס', 'ZZ-CARD', 'per_item') RETURNING id INTO s_card;
  INSERT INTO packaging_supplies (name, sku, consumption_mode) VALUES ('סרט', 'ZZ-MANUAL', 'manual') RETURNING id INTO s_manual;
  PERFORM inv_apply(NULL, s_box, NULL, 20, 'count', NULL, NULL, NULL, NULL);
  PERFORM inv_apply(NULL, s_card, NULL, 50, 'count', NULL, NULL, NULL, NULL);

  -- ---- order 2: kit only → paid, shipped, refunded after shipping ----
  INSERT INTO orders (line_items, shipping_address, total_price, currency_code, financial_status, fulfillment_status, expires_at, customer_email)
  VALUES (jsonb_build_array(jsonb_build_object('product_id', p_k, 'variant_id', v_k, 'quantity', 1, 'title', 'מארז בדיקה', 'price', '30')),
          '{}'::jsonb, 30, 'ILS', 'pending', 'unfulfilled', now() + interval '2 hours', 'test@example.com')
  RETURNING id INTO o2;
  UPDATE orders SET financial_status = 'paid' WHERE id = o2;
  ASSERT (SELECT on_hand FROM inventory_levels WHERE variant_id = v_a) = 8, 'sale A o2';

  UPDATE orders SET fulfillment_status = 'shipped' WHERE id = o2;
  ASSERT (SELECT on_hand FROM packaging_supplies WHERE id = s_box) = 19, 'per_order consume';
  ASSERT (SELECT on_hand FROM packaging_supplies WHERE id = s_card) = 47, 'per_item consume (3 units)';
  ASSERT (SELECT on_hand FROM packaging_supplies WHERE id = s_manual) = 0, 'manual untouched';

  -- shipped again is idempotent
  UPDATE orders SET fulfillment_status = 'unfulfilled' WHERE id = o2;
  UPDATE orders SET fulfillment_status = 'shipped' WHERE id = o2;
  ASSERT (SELECT on_hand FROM packaging_supplies WHERE id = s_box) = 19, 'consume replay';

  -- refund after shipping → no automatic return
  UPDATE orders SET financial_status = 'refunded' WHERE id = o2;
  ASSERT (SELECT on_hand FROM inventory_levels WHERE variant_id = v_a) = 8, 'shipped refund restocked';
  ASSERT NOT EXISTS (SELECT 1 FROM inventory_movements WHERE order_id = o2 AND reason = 'return'), 'unexpected return';

  -- ---- order 3: untracked part → paid writes nothing ----
  INSERT INTO orders (line_items, shipping_address, total_price, currency_code, financial_status, fulfillment_status, expires_at, customer_email)
  VALUES (jsonb_build_array(jsonb_build_object('product_id', p_c, 'variant_id', v_c, 'quantity', 2, 'title', 'חלק ג', 'price', '10')),
          '{}'::jsonb, 20, 'ILS', 'pending', 'unfulfilled', now() + interval '2 hours', 'test@example.com')
  RETURNING id INTO o3;
  UPDATE orders SET financial_status = 'paid' WHERE id = o3;
  ASSERT NOT EXISTS (SELECT 1 FROM inventory_levels WHERE variant_id = v_c), 'untracked got a level row';
  ASSERT NOT EXISTS (SELECT 1 FROM inventory_movements WHERE order_id = o3), 'untracked got a movement';

  -- ---- alert stamp clears when stock rises above threshold ----
  UPDATE inventory_levels SET low_stock_alerted_at = now(), low_stock_threshold = 9 WHERE variant_id = v_a; -- on_hand 8 ≤ 9
  PERFORM inv_apply(v_a, NULL, 100, NULL, 'receive', NULL, 'חשבונית 1', NULL, NULL);
  ASSERT (SELECT low_stock_alerted_at FROM inventory_levels WHERE variant_id = v_a) IS NULL, 'alert stamp not cleared';

  -- ---- direct on_hand edits are blocked ----
  BEGIN
    UPDATE inventory_levels SET on_hand = 0 WHERE variant_id = v_a;
    RAISE EXCEPTION 'guard did not fire';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'on_hand changes only%' THEN RAISE; END IF;
  END;

  -- ---- admin RPC refuses non-admins and system reasons ----
  BEGIN
    PERFORM record_inventory_movements(jsonb_build_array(jsonb_build_object('variant_id', v_a, 'delta', 1, 'reason', 'receive')));
    RAISE EXCEPTION 'non-admin RPC succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  RAISE NOTICE 'inventory_scenarios: all assertions passed';
END $$;

ROLLBACK;
```

- [ ] **Step 3: Push the migration, run the scenarios**

Run:
```bash
SUPABASE_DB_PASSWORD=$(security find-generic-password -s mothersday-supabase-db -w) supabase db push
PGPASSWORD=$(security find-generic-password -s mothersday-supabase-db -w) $PSQL -f supabase/tests/inventory_scenarios.sql
```
Expected: push succeeds; the test prints `NOTICE:  inventory_scenarios: all assertions passed` followed by `ROLLBACK`. Any `ASSERT` failure names the failing step; fix the function, re-push and re-run. Reminder: `supabase db push` only applies files it has not seen, so to re-apply a changed function file run the SQL directly with `$PSQL -f supabase/migrations/20260906090100_inventory_functions.sql` and then push once it is right.

- [ ] **Step 4: Confirm the trigger-based path also works through mark_order_paid**

Run:
```bash
PGPASSWORD=$(security find-generic-password -s mothersday-supabase-db -w) $PSQL <<'SQL'
BEGIN;
DO $$
DECLARE o UUID; v UUID; p UUID; r RECORD;
BEGIN
  SELECT v2.id, v2.product_id INTO v, p FROM product_variants v2 JOIN products p2 ON p2.id = v2.product_id WHERE p2.handle = 'בלוק-תכנון-קטן';
  PERFORM inv_apply(v, NULL, NULL, 25, 'count', NULL, 'test', NULL, NULL);
  INSERT INTO orders (line_items, shipping_address, total_price, currency_code, financial_status, fulfillment_status, expires_at, customer_email)
  VALUES (jsonb_build_array(jsonb_build_object('product_id', p, 'variant_id', v, 'quantity', 2, 'title', 'x', 'price', '10')),
          '{}'::jsonb, 20, 'ILS', 'pending', 'unfulfilled', now() + interval '2 hours', 'test@example.com') RETURNING id INTO o;
  SELECT * INTO r FROM mark_order_paid(o, 'payplus', 'txn-test', NULL, 20, 'ILS', '000', 'credit-card', 'visa', '1234', 'appr', '{}'::jsonb);
  ASSERT r.updated, 'mark_order_paid did not update';
  ASSERT (SELECT on_hand FROM inventory_levels WHERE variant_id = v) = 23, 'trigger did not fire from mark_order_paid';
  RAISE NOTICE 'mark_order_paid → trigger OK';
END $$;
ROLLBACK;
SQL
```
Expected: `NOTICE:  mark_order_paid → trigger OK`, then `ROLLBACK`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260906090100_inventory_functions.sql supabase/tests/inventory_scenarios.sql
git commit -m "Inventory: inv_apply ledger writer, order triggers, admin RPC, mark_order_paid without stock code

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Views, `check_order_stock`, grants

**Files:**
- Create: `supabase/migrations/20260906090200_inventory_views.sql`
- Modify: `supabase/tests/inventory_scenarios.sql` (append a second DO block before `ROLLBACK;`)

**Interfaces:**
- Consumes: Task 2 functions.
- Produces:
  - Public (anon + authenticated): `storefront_availability(product_id, variant_id, sellable BOOLEAN, max_orderable INT NULL)` — one row per variant, kit variants carry kit values. `variant_availability`, `kit_availability(bundle_id, can_build INT NULL, limiting_variant_id UUID NULL)`.
  - Staff/service only (rows filtered by `is_staff_or_service()`): `variant_stock`, `supply_stock`, `kit_stock`, `inventory_movement_log`. Column lists below; the admin UI and `api/_lib/inventory.ts` read these.
  - `check_order_stock(p_items JSONB) RETURNS TABLE(variant_id UUID, title TEXT, requested INT, available INT)` — shortages only; service role only.

- [ ] **Step 1: Write the migration**

```sql
-- =============================================================================
-- Inventory, part 3/3: views + order-time stock check
-- Spec §4.2, §8. Views are owner-rights on purpose: the public ones expose only
-- sellable/max_orderable; the staff ones filter every row by is_staff_or_service().
-- =============================================================================

-- True for admins (profiles.role) and for the service role used by api/ functions.
-- Not SECURITY DEFINER so current_user is the caller's role.
CREATE OR REPLACE FUNCTION public.is_staff_or_service()
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.is_admin() OR current_user = 'service_role'
$$;

-- Derived reservations: pending, unexpired orders hold their exploded quantities.
CREATE OR REPLACE VIEW public.inventory_reserved AS
SELECT l.variant_id, SUM(l.qty)::int AS reserved
FROM orders o
CROSS JOIN LATERAL order_stock_lines(o.id) l
WHERE o.financial_status = 'pending'
  AND o.expires_at IS NOT NULL AND o.expires_at > now()
  AND COALESCE((SELECT (value #>> '{}')::boolean FROM store_settings WHERE key = 'inventory_reserve_pending'), true)
GROUP BY l.variant_id;

CREATE OR REPLACE VIEW public.variant_availability AS
SELECT v.id AS variant_id,
       v.product_id,
       (v.available_for_sale
         AND (l.variant_id IS NULL OR l.policy = 'continue' OR (l.on_hand - COALESCE(r.reserved, 0)) > 0)) AS sellable,
       CASE WHEN l.variant_id IS NULL OR l.policy = 'continue' THEN NULL
            ELSE LEAST(GREATEST(l.on_hand - COALESCE(r.reserved, 0), 0), 20) END AS max_orderable
FROM product_variants v
JOIN products p ON p.id = v.product_id
LEFT JOIN inventory_levels l ON l.variant_id = v.id
LEFT JOIN inventory_reserved r ON r.variant_id = v.id
WHERE NOT p.is_bundle;

-- Kit availability = the smallest floor(part available ÷ part quantity); NULL = no tracked part.
CREATE OR REPLACE VIEW public.kit_availability AS
WITH comp AS (
  SELECT bi.bundle_id,
         cv.vid AS variant_id,
         CASE WHEN l.variant_id IS NULL OR l.policy = 'continue' THEN NULL
              ELSE floor(GREATEST(l.on_hand - COALESCE(r.reserved, 0), 0)::numeric
                         / GREATEST(COALESCE(bi.quantity, 1), 1))::int
         END AS can_build
  FROM bundle_items bi
  CROSS JOIN LATERAL (
    SELECT COALESCE(bi.variant_id,
      (SELECT pv.id FROM product_variants pv WHERE pv.product_id = bi.product_id
       ORDER BY pv.sort_order, pv.created_at LIMIT 1)) AS vid
  ) cv
  LEFT JOIN inventory_levels l ON l.variant_id = cv.vid
  LEFT JOIN inventory_reserved r ON r.variant_id = cv.vid
),
ranked AS (
  SELECT bundle_id, variant_id, can_build,
         ROW_NUMBER() OVER (PARTITION BY bundle_id ORDER BY can_build NULLS LAST) AS rn
  FROM comp
)
SELECT r.bundle_id,
       agg.can_build,
       CASE WHEN agg.can_build IS NULL THEN NULL ELSE r.variant_id END AS limiting_variant_id
FROM ranked r
JOIN (SELECT bundle_id, MIN(can_build) AS can_build FROM comp GROUP BY bundle_id) agg ON agg.bundle_id = r.bundle_id
WHERE r.rn = 1;

-- The ONE view the storefront and the SEO prerender read.
CREATE OR REPLACE VIEW public.storefront_availability AS
SELECT va.product_id, va.variant_id, va.sellable, va.max_orderable
FROM variant_availability va
UNION ALL
SELECT p.id, v.id,
       (v.available_for_sale AND (k.can_build IS NULL OR k.can_build > 0)),
       CASE WHEN k.can_build IS NULL THEN NULL ELSE LEAST(k.can_build, 20) END
FROM products p
JOIN product_variants v ON v.product_id = p.id
LEFT JOIN kit_availability k ON k.bundle_id = p.id
WHERE p.is_bundle;

-- ---------------------------------------------------------------------------
-- Staff views
-- ---------------------------------------------------------------------------
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
WHERE NOT p.is_bundle AND is_staff_or_service();

CREATE OR REPLACE VIEW public.supply_stock AS
SELECT s.id AS supply_id, s.name, s.sku, s.on_hand, s.consumption_mode, s.quantity_per_use, s.is_active,
       COALESCE(s.low_stock_threshold, d.default_threshold) AS threshold,
       s.low_stock_threshold AS own_threshold,
       s.low_stock_alerted_at, s.updated_at,
       CASE WHEN s.on_hand < 0 THEN 'short'
            WHEN s.on_hand <= 0 THEN 'out'
            WHEN s.on_hand <= COALESCE(s.low_stock_threshold, d.default_threshold) THEN 'low'
            ELSE 'ok' END AS status,
       (SELECT max(m.created_at) FROM inventory_movements m WHERE m.supply_id = s.id) AS last_movement_at
FROM packaging_supplies s
CROSS JOIN (SELECT COALESCE((SELECT (value #>> '{}')::int FROM store_settings WHERE key = 'low_stock_threshold_default'), 5) AS default_threshold) d
WHERE is_staff_or_service();

CREATE OR REPLACE VIEW public.kit_stock AS
SELECT p.id AS bundle_id, p.title AS bundle_title, p.handle AS bundle_handle, p.status AS product_status,
       k.can_build, k.limiting_variant_id,
       CASE WHEN lp.id IS NULL THEN NULL
            ELSE lp.title || CASE WHEN lv.title IN ('Default Title', 'ברירת מחדל') THEN '' ELSE ' — ' || lv.title END
       END AS limiting_title
FROM products p
LEFT JOIN kit_availability k ON k.bundle_id = p.id
LEFT JOIN product_variants lv ON lv.id = k.limiting_variant_id
LEFT JOIN products lp ON lp.id = lv.product_id
WHERE p.is_bundle AND is_staff_or_service();

CREATE OR REPLACE VIEW public.inventory_movement_log AS
SELECT m.id, m.created_at, m.delta, m.on_hand_after, m.reason, m.order_id, m.reference, m.note,
       m.variant_id, m.supply_id,
       CASE WHEN m.variant_id IS NOT NULL THEN 'variant' ELSE 'supply' END AS item_kind,
       COALESCE(p.title || CASE WHEN v.title IN ('Default Title', 'ברירת מחדל') THEN '' ELSE ' — ' || v.title END,
                s.name) AS item_title,
       COALESCE(v.sku, s.sku) AS sku,
       o.order_number,
       pr.email AS actor_email
FROM inventory_movements m
LEFT JOIN product_variants v ON v.id = m.variant_id
LEFT JOIN products p ON p.id = v.product_id
LEFT JOIN packaging_supplies s ON s.id = m.supply_id
LEFT JOIN orders o ON o.id = m.order_id
LEFT JOIN profiles pr ON pr.id = m.created_by
WHERE is_staff_or_service();

-- ---------------------------------------------------------------------------
-- Order-time check: shortages for a cart, kits exploded. Service role only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_order_stock(p_items JSONB)
RETURNS TABLE (variant_id UUID, title TEXT, requested INTEGER, available INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.inventory_reserved FROM PUBLIC, anon, authenticated;     -- internal to the views above
GRANT SELECT ON public.storefront_availability, public.variant_availability, public.kit_availability TO anon, authenticated;
REVOKE ALL ON public.variant_stock, public.supply_stock, public.kit_stock, public.inventory_movement_log FROM PUBLIC, anon;
GRANT SELECT ON public.variant_stock, public.supply_stock, public.kit_stock, public.inventory_movement_log TO authenticated;
REVOKE ALL ON FUNCTION public.check_order_stock(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_staff_or_service() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_or_service() TO anon, authenticated;
```

- [ ] **Step 2: Append the availability scenarios to the test script**

Insert this second block into `supabase/tests/inventory_scenarios.sql` after the first `END $$;` and before `ROLLBACK;`:

```sql
DO $$
DECLARE
  p_a UUID; p_c UUID; p_k UUID; v_a UUID; v_b UUID; v_c UUID; v_k UUID; o UUID; n INTEGER; r RECORD;
BEGIN
  SELECT v.id, p.id INTO v_a, p_a FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.handle = 'zz-test-part-a';
  SELECT v.id INTO v_b FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.handle = 'zz-test-part-b';
  SELECT v.id, p.id INTO v_c, p_c FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.handle = 'zz-test-part-c';
  SELECT v.id, p.id INTO v_k, p_k FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.handle = 'zz-test-kit';

  -- clean numbers: A=10, B=3 → kit (2A+1B) can build min(5,3)=3, limited by B
  PERFORM inv_apply(v_a, NULL, NULL, 10, 'count', NULL, 'reset', NULL, NULL);
  PERFORM inv_apply(v_b, NULL, NULL, 3,  'count', NULL, 'reset', NULL, NULL);
  ASSERT (SELECT can_build FROM kit_availability WHERE bundle_id = p_k) = 3, 'kit can_build 3';
  ASSERT (SELECT limiting_variant_id FROM kit_availability WHERE bundle_id = p_k) = v_b, 'kit limited by B';

  -- a pending, unexpired order for 6×A reserves 6 → A available 4 → kit floor(4/2)=2, limited by A
  INSERT INTO orders (line_items, shipping_address, total_price, currency_code, financial_status, fulfillment_status, expires_at, customer_email)
  VALUES (jsonb_build_array(jsonb_build_object('product_id', p_a, 'variant_id', v_a, 'quantity', 6, 'title', 'חלק א', 'price', '10')),
          '{}'::jsonb, 60, 'ILS', 'pending', 'unfulfilled', now() + interval '2 hours', 'test@example.com') RETURNING id INTO o;
  ASSERT (SELECT reserved FROM inventory_reserved WHERE variant_id = v_a) = 6, 'reserved A';
  ASSERT (SELECT max_orderable FROM variant_availability WHERE variant_id = v_a) = 4, 'max_orderable A';
  ASSERT (SELECT sellable FROM variant_availability WHERE variant_id = v_a), 'A sellable';
  ASSERT (SELECT can_build FROM kit_availability WHERE bundle_id = p_k) = 2, 'kit can_build 2 with reservation';
  ASSERT (SELECT limiting_variant_id FROM kit_availability WHERE bundle_id = p_k) = v_a, 'kit limited by A';
  ASSERT (SELECT max_orderable FROM storefront_availability WHERE variant_id = v_k) = 2, 'kit max_orderable';
  ASSERT (SELECT sellable FROM storefront_availability WHERE variant_id = v_k), 'kit sellable';
  ASSERT (SELECT max_orderable FROM storefront_availability WHERE variant_id = v_c) IS NULL, 'untracked unlimited';

  -- an expired pending order reserves nothing
  INSERT INTO orders (line_items, shipping_address, total_price, currency_code, financial_status, fulfillment_status, expires_at, customer_email)
  VALUES (jsonb_build_array(jsonb_build_object('product_id', p_a, 'variant_id', v_a, 'quantity', 100, 'title', 'חלק א', 'price', '10')),
          '{}'::jsonb, 1000, 'ILS', 'pending', 'unfulfilled', now() - interval '1 minute', 'test@example.com');
  ASSERT (SELECT reserved FROM inventory_reserved WHERE variant_id = v_a) = 6, 'expired order reserved stock';

  -- check_order_stock: shortages only, kits exploded, untracked ignored
  SELECT count(*) INTO n FROM check_order_stock(jsonb_build_array(jsonb_build_object('product_id', p_a, 'variant_id', v_a, 'quantity', 5)));
  ASSERT n = 1, '5×A should be short (available 4)';
  SELECT * INTO r FROM check_order_stock(jsonb_build_array(jsonb_build_object('product_id', p_a, 'variant_id', v_a, 'quantity', 5)));
  ASSERT r.requested = 5 AND r.available = 4 AND r.title = 'חלק א', format('shortage row: %s', r);
  SELECT count(*) INTO n FROM check_order_stock(jsonb_build_array(jsonb_build_object('product_id', p_k, 'variant_id', v_k, 'quantity', 3)));
  ASSERT n = 1, '3 kits need 6×A, only 4 available';
  SELECT count(*) INTO n FROM check_order_stock(jsonb_build_array(jsonb_build_object('product_id', p_k, 'variant_id', v_k, 'quantity', 2)));
  ASSERT n = 0, '2 kits fit';
  SELECT count(*) INTO n FROM check_order_stock(jsonb_build_array(jsonb_build_object('product_id', p_c, 'variant_id', v_c, 'quantity', 99)));
  ASSERT n = 0, 'untracked never short';

  -- reservation switch off → nothing reserved
  UPDATE store_settings SET value = 'false'::jsonb WHERE key = 'inventory_reserve_pending';
  ASSERT NOT EXISTS (SELECT 1 FROM inventory_reserved WHERE variant_id = v_a), 'switch off still reserves';
  UPDATE store_settings SET value = 'true'::jsonb WHERE key = 'inventory_reserve_pending';

  -- out of stock → not sellable; policy continue → sellable, unlimited
  PERFORM inv_apply(v_a, NULL, NULL, 0, 'count', NULL, 'reset', NULL, NULL);
  ASSERT NOT (SELECT sellable FROM variant_availability WHERE variant_id = v_a), 'A at 0 still sellable';
  ASSERT NOT (SELECT sellable FROM storefront_availability WHERE variant_id = v_k), 'kit with 0 part still sellable';
  UPDATE inventory_levels SET policy = 'continue' WHERE variant_id = v_a;
  ASSERT (SELECT sellable FROM variant_availability WHERE variant_id = v_a), 'continue policy not sellable';
  ASSERT (SELECT max_orderable FROM variant_availability WHERE variant_id = v_a) IS NULL, 'continue policy capped';
  UPDATE inventory_levels SET policy = 'deny' WHERE variant_id = v_a;

  -- staff views: empty for postgres/anon, populated for service_role
  ASSERT NOT EXISTS (SELECT 1 FROM variant_stock), 'variant_stock visible without staff role';
  EXECUTE 'SET LOCAL ROLE service_role';
  ASSERT (SELECT status FROM variant_stock WHERE variant_id = v_a) = 'out', 'variant_stock status';
  ASSERT (SELECT status FROM variant_stock WHERE variant_id = v_c) = 'untracked', 'untracked status';
  ASSERT (SELECT can_build FROM kit_stock WHERE bundle_id = p_k) = 0, 'kit_stock';
  ASSERT (SELECT count(*) FROM inventory_movement_log WHERE variant_id = v_a) > 0, 'movement log';
  ASSERT (SELECT status FROM supply_stock WHERE sku = 'ZZ-BOX') = 'ok', 'supply_stock';
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE anon';
  ASSERT NOT EXISTS (SELECT 1 FROM variant_stock), 'anon sees variant_stock';
  ASSERT EXISTS (SELECT 1 FROM storefront_availability WHERE variant_id = v_a), 'anon cannot read storefront_availability';
  EXECUTE 'RESET ROLE';

  RAISE NOTICE 'availability_scenarios: all assertions passed';
END $$;
```

- [ ] **Step 3: Push and run**

Run:
```bash
SUPABASE_DB_PASSWORD=$(security find-generic-password -s mothersday-supabase-db -w) supabase db push
PGPASSWORD=$(security find-generic-password -s mothersday-supabase-db -w) $PSQL -f supabase/tests/inventory_scenarios.sql
```
Expected: both `NOTICE` lines (`inventory_scenarios` and `availability_scenarios`) and `ROLLBACK`. If `SET LOCAL ROLE anon` fails with a permission error, run the script as is (postgres can SET ROLE to any role on Supabase); if `inventory_reserved` complains about privileges under `anon`, the owner-rights view is fine and the complaint means a `GRANT` to anon slipped onto `inventory_reserved` — re-run the `REVOKE` line.

- [ ] **Step 4: Confirm production rows read correctly**

Run:
```bash
PGPASSWORD=$(security find-generic-password -s mothersday-supabase-db -w) $PSQL -c "SELECT count(*) FILTER (WHERE sellable) AS sellable, count(*) AS total FROM storefront_availability;"
```
Expected: `sellable` = `total` = 17 (nothing is tracked yet, so everything stays sellable — the storefront is unchanged until Eden's first count).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260906090200_inventory_views.sql supabase/tests/inventory_scenarios.sql
git commit -m "Inventory: availability views, staff stock views, check_order_stock

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Server inventory helpers + Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (script `test`, devDependency `vitest`)
- Create: `api/_lib/inventory.ts`
- Create: `api/_lib/inventory.test.ts`

**Interfaces:**
- Consumes: RPCs `check_order_stock`, `order_stock_lines`; views `variant_stock`, `kit_stock`, `supply_stock`; tables `inventory_levels`, `packaging_supplies`, `inventory_movements` (service role).
- Produces (all exported from `api/_lib/inventory.ts`):
  - `StockLineInput { product_id: string; variant_id: string; quantity: number }`
  - `StockShortage { variant_id: string; title: string; requested: number; available: number }`
  - `checkOrderStock(supabase, items: StockLineInput[]): Promise<StockShortage[]>` — `[]` when everything fits; fails open (`[]` + warning) when the RPC does not exist yet (`PGRST202`).
  - `formatShortageMessage(shortages): string` — Hebrew, customer-facing.
  - `parseAlertEmails(raw): string[]`
  - `itemTitle(productTitle, variantTitle): string`
  - `LowStockItem { kind: 'variant'|'supply'; id; title; sku: string|null; available: number; threshold: number; status: 'low'|'out'|'short'; blockedKits: string[] }`
  - `collectLowStockForOrder(supabase, orderId): Promise<LowStockItem[]>`, `collectLowStockSupplies(supabase, orderId): Promise<LowStockItem[]>`, `stampLowStockAlerted(supabase, items): Promise<void>`

- [ ] **Step 1: Add Vitest**

Run: `npm install --save-dev vitest`

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["api/**/*.test.ts", "src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
```

In `package.json` scripts add `"test": "vitest run"` after `"lint"`.

- [ ] **Step 2: Write the failing tests**

`api/_lib/inventory.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatShortageMessage, itemTitle, parseAlertEmails } from "./inventory.js";

describe("parseAlertEmails", () => {
  it("splits on commas, semicolons and whitespace, lowercases, dedupes", () => {
    expect(parseAlertEmails(" Eden@mothersday.co.il, oron@mothersday.co.il;eden@mothersday.co.il ")).toEqual([
      "eden@mothersday.co.il",
      "oron@mothersday.co.il",
    ]);
  });
  it("drops blanks and non-addresses", () => {
    expect(parseAlertEmails("nope, , a@b.co")).toEqual(["a@b.co"]);
    expect(parseAlertEmails(undefined)).toEqual([]);
  });
});

describe("formatShortageMessage", () => {
  it("names the item, what is left and what was asked", () => {
    expect(
      formatShortageMessage([
        { variant_id: "v1", title: "מחברת שורות קטנה", requested: 3, available: 2 },
        { variant_id: "v2", title: "בלוק תכנון גדול", requested: 1, available: 0 },
      ]),
    ).toBe("מחברת שורות קטנה: נשארו 2 יח׳ (ביקשת 3); בלוק תכנון גדול: אזל מהמלאי");
  });
});

describe("itemTitle", () => {
  it("appends a real variant title and hides the default one", () => {
    expect(itemTitle("לוח משפחתי שבועי", "ריפיל — דפים בלבד")).toBe("לוח משפחתי שבועי — ריפיל — דפים בלבד");
    expect(itemTitle("לוח שבועי", "Default Title")).toBe("לוח שבועי");
    expect(itemTitle("לוח שבועי", null)).toBe("לוח שבועי");
  });
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npm test -- api/_lib/inventory.test.ts`
Expected: FAIL — `Cannot find module './inventory.js'` (or equivalent resolution error).

- [ ] **Step 4: Write `api/_lib/inventory.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side inventory helpers (service role). The database owns the rules
 * (spec §4); these functions only call the RPCs/views and shape the results
 * for the order API and the owners' emails.
 */

export interface StockLineInput {
  product_id: string;
  variant_id: string;
  quantity: number;
}

export interface StockShortage {
  variant_id: string;
  title: string;
  requested: number;
  available: number;
}

/**
 * Shortages for a cart, kits exploded to parts by the database. [] = every line fits.
 * Fails OPEN if the inventory migration is not applied yet (function missing).
 */
export async function checkOrderStock(
  supabase: SupabaseClient,
  items: StockLineInput[],
): Promise<StockShortage[]> {
  const { data, error } = await supabase.rpc("check_order_stock", { p_items: items });
  if (error) {
    if (error.code === "PGRST202") {
      console.warn("check_order_stock: RPC missing (inventory migration not applied) — skipping stock check");
      return [];
    }
    throw new Error(`check_order_stock failed: ${error.message}`);
  }
  return (data ?? []) as StockShortage[];
}

/** Customer-facing Hebrew, e.g. "מחברת שורות קטנה: נשארו 2 יח׳ (ביקשת 3)". */
export function formatShortageMessage(shortages: StockShortage[]): string {
  return shortages
    .map((s) =>
      s.available <= 0 ? `${s.title}: אזל מהמלאי` : `${s.title}: נשארו ${s.available} יח׳ (ביקשת ${s.requested})`,
    )
    .join("; ");
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** "a@x.co.il, B@x.co.il" → ["a@x.co.il", "b@x.co.il"]; blanks and junk dropped, deduped. */
export function parseAlertEmails(raw: string | undefined | null): string[] {
  const seen = new Set<string>();
  for (const part of (raw ?? "").split(/[,;\s]+/)) {
    const email = part.trim().toLowerCase();
    if (email && EMAIL_RE.test(email)) seen.add(email);
  }
  return [...seen];
}

const DEFAULT_VARIANT_TITLES = new Set(["Default Title", "ברירת מחדל"]);

export function itemTitle(productTitle: string, variantTitle: string | null | undefined): string {
  return variantTitle && !DEFAULT_VARIANT_TITLES.has(variantTitle)
    ? `${productTitle} — ${variantTitle}`
    : productTitle;
}

export interface LowStockItem {
  kind: "variant" | "supply";
  id: string;
  title: string;
  sku: string | null;
  available: number;
  threshold: number;
  status: "low" | "out" | "short";
  blockedKits: string[];
}

interface VariantStockRow {
  variant_id: string;
  product_title: string;
  variant_title: string | null;
  sku: string | null;
  available: number | null;
  threshold: number;
  status: string;
  low_stock_alerted_at: string | null;
}

interface KitStockRow {
  bundle_title: string;
  can_build: number | null;
  limiting_variant_id: string | null;
}

interface SupplyStockRow {
  supply_id: string;
  name: string;
  sku: string | null;
  on_hand: number;
  threshold: number;
  status: string;
  low_stock_alerted_at: string | null;
}

const isLowStatus = (status: string): status is LowStockItem["status"] =>
  status === "low" || status === "out" || status === "short";

/** Variants sold in this order that are now at/under threshold and have not been alerted yet. */
export async function collectLowStockForOrder(supabase: SupabaseClient, orderId: string): Promise<LowStockItem[]> {
  const { data: lines, error: linesError } = await supabase.rpc("order_stock_lines", { p_order_id: orderId });
  if (linesError || !Array.isArray(lines) || lines.length === 0) {
    if (linesError && linesError.code !== "PGRST202") console.error("order_stock_lines failed", orderId, linesError);
    return [];
  }
  const variantIds = (lines as Array<{ variant_id: string }>).map((l) => l.variant_id);

  const { data: rows, error } = await supabase
    .from("variant_stock")
    .select("variant_id, product_title, variant_title, sku, available, threshold, status, low_stock_alerted_at")
    .in("variant_id", variantIds);
  if (error) {
    console.error("variant_stock read failed", orderId, error);
    return [];
  }
  const hits = ((rows ?? []) as VariantStockRow[]).filter((r) => isLowStatus(r.status) && !r.low_stock_alerted_at);
  if (hits.length === 0) return [];

  const { data: kits } = await supabase
    .from("kit_stock")
    .select("bundle_title, can_build, limiting_variant_id")
    .in("limiting_variant_id", hits.map((h) => h.variant_id));
  const blocked = new Map<string, string[]>();
  for (const k of (kits ?? []) as KitStockRow[]) {
    if (k.limiting_variant_id && (k.can_build ?? 1) <= 0) {
      blocked.set(k.limiting_variant_id, [...(blocked.get(k.limiting_variant_id) ?? []), k.bundle_title]);
    }
  }

  return hits.map((r) => ({
    kind: "variant",
    id: r.variant_id,
    title: itemTitle(r.product_title, r.variant_title),
    sku: r.sku,
    available: r.available ?? 0,
    threshold: r.threshold,
    status: r.status as LowStockItem["status"],
    blockedKits: blocked.get(r.variant_id) ?? [],
  }));
}

/** Packaging supplies consumed by this order (shipped) that are now low and not yet alerted. */
export async function collectLowStockSupplies(supabase: SupabaseClient, orderId: string): Promise<LowStockItem[]> {
  const { data: moves, error: movesError } = await supabase
    .from("inventory_movements")
    .select("supply_id")
    .eq("order_id", orderId)
    .eq("reason", "consume");
  if (movesError || !moves?.length) return [];
  const supplyIds = moves.map((m: { supply_id: string }) => m.supply_id);

  const { data: rows, error } = await supabase
    .from("supply_stock")
    .select("supply_id, name, sku, on_hand, threshold, status, low_stock_alerted_at")
    .in("supply_id", supplyIds);
  if (error) {
    console.error("supply_stock read failed", orderId, error);
    return [];
  }
  return ((rows ?? []) as SupplyStockRow[])
    .filter((r) => isLowStatus(r.status) && !r.low_stock_alerted_at)
    .map((r) => ({
      kind: "supply",
      id: r.supply_id,
      title: r.name,
      sku: r.sku,
      available: r.on_hand,
      threshold: r.threshold,
      status: r.status as LowStockItem["status"],
      blockedKits: [],
    }));
}

/** Marks items as alerted so the next dip (after a restock clears the stamp) alerts again. */
export async function stampLowStockAlerted(supabase: SupabaseClient, items: LowStockItem[]): Promise<void> {
  const now = new Date().toISOString();
  const variantIds = items.filter((i) => i.kind === "variant").map((i) => i.id);
  const supplyIds = items.filter((i) => i.kind === "supply").map((i) => i.id);
  if (variantIds.length) {
    const { error } = await supabase.from("inventory_levels").update({ low_stock_alerted_at: now }).in("variant_id", variantIds);
    if (error) console.error("stampLowStockAlerted levels failed", error);
  }
  if (supplyIds.length) {
    const { error } = await supabase.from("packaging_supplies").update({ low_stock_alerted_at: now }).in("id", supplyIds);
    if (error) console.error("stampLowStockAlerted supplies failed", error);
  }
}
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- api/_lib/inventory.test.ts`
Expected: PASS (3 test groups, 5 tests).

- [ ] **Step 6: Type-check and commit**

Run: `npx tsc --noEmit -p tsconfig.node.json 2>&1 | grep -E "api/_lib/inventory" ; npx eslint api/_lib/inventory.ts api/_lib/inventory.test.ts vitest.config.ts`
Expected: no output from the grep, eslint clean.

```bash
git add vitest.config.ts package.json package-lock.json api/_lib/inventory.ts api/_lib/inventory.test.ts
git commit -m "Inventory: server helpers (stock check, low-stock collection) + Vitest

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Stock check in `/api/create-order`

**Files:**
- Modify: `api/create-order.ts` (imports at top; new block right after the variant validation loop that ends with `"One or more cart items are no longer available"`, before the `// First image per product` comment)

**Interfaces:**
- Consumes: `checkOrderStock`, `formatShortageMessage` from Task 4.
- Produces: HTTP 409 `{ error: "insufficient_stock", message: <Hebrew>, shortages: StockShortage[] }`. The client (Task 8) maps the code.

- [ ] **Step 1: Add the import**

After the `evaluateCoupon` import line add:

```ts
import { checkOrderStock, formatShortageMessage, type StockShortage } from "./_lib/inventory.js";
```

- [ ] **Step 2: Add the check**

Immediately after the `for (const item of items) { … items_unavailable … }` loop insert:

```ts
  // Stock (spec §5): the database explodes kits to their parts and reports
  // shortages against on_hand minus reservations held by other pending orders.
  let shortages: StockShortage[] = [];
  try {
    shortages = await checkOrderStock(supabase, items);
  } catch (error) {
    console.error("create-order: stock check failed", error);
    return res.status(500).json({ error: "Failed to validate stock" });
  }
  if (shortages.length > 0) {
    return res.status(409).json({
      error: "insufficient_stock",
      message: formatShortageMessage(shortages),
      shortages,
    });
  }
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit -p tsconfig.node.json 2>&1 | grep "api/create-order"; npx eslint api/create-order.ts`
Expected: no output.

- [ ] **Step 4: Verify on a preview deployment**

`api/` does not run under `npm run dev`; push the branch so Vercel builds a preview, then exercise it against a temporarily tracked variant. Everything below is rolled back or reversed.

```bash
git push origin launch/payplus
# wait for the preview build, then (preview host from `vercel ls` or the Vercel dashboard):
PREVIEW=https://mothers-day-git-launch-payplus-oronmails-projects.vercel.app
# 1) track בלוק תכנון קטן at 2 units (real write; reversed in step 3)
PGPASSWORD=$(security find-generic-password -s mothersday-supabase-db -w) $PSQL -c "SELECT inv_apply(v.id, NULL, NULL, 2, 'count', NULL, 'create-order test', NULL, NULL) FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.handle='בלוק-תכנון-קטן';"
# 2) ask for 3
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$PREVIEW/api/create-order" -H "Content-Type: application/json" -d '{
  "items":[{"product_id":"<uuid of בלוק תכנון קטן>","variant_id":"177ae2ef-09fb-4bf5-a772-14f89b25c927","quantity":3}],
  "email":"test@example.com",
  "shippingAddress":{"full_name":"בדיקה בדיקה","city":"תל אביב","street":"הרצל","house_number":"1","phone":"0501234567"}}'
```
Expected: `409` and a body containing `"insufficient_stock"` and `בלוק תכנון קטן: נשארו 2 יח׳ (ביקשת 3)`. With `"quantity":2` expected `200` (a pending test order is created — delete it afterwards: `DELETE FROM orders WHERE customer_email='test@example.com' AND financial_status='pending';`). If you get `503 Checkout is currently disabled`, set `CHECKOUT_ENABLED=true` on the Preview environment for the duration of the test (`vercel env add CHECKOUT_ENABLED preview`) and redeploy. The product uuid: `SELECT id FROM products WHERE handle='בלוק-תכנון-קטן';`.

```bash
# 3) stop tracking again (delete the level row and its test movements)
PGPASSWORD=$(security find-generic-password -s mothersday-supabase-db -w) $PSQL -c "DELETE FROM inventory_movements WHERE reference='create-order test'; DELETE FROM inventory_levels WHERE variant_id='177ae2ef-09fb-4bf5-a772-14f89b25c927';"
```
(Deleting is acceptable here only because this was a test row you created a minute ago; real ledger rows are never deleted.)

- [ ] **Step 5: Commit**

```bash
git add api/create-order.ts
git commit -m "create-order: refuse lines the stock cannot cover (409 insufficient_stock)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Owners' new-order email (with folded low-stock section)

**Files:**
- Create: `api/_lib/newOrderAdminEmail.ts`
- Create: `api/_lib/newOrderAdminEmail.test.ts`
- Modify: `api/_lib/orderPayment.ts` (new export `notifyOwnersOfPaidOrder`)
- Modify: `api/payplus-callback.ts` (after `await sendPaidOrderEmail(...)` inside `if (result.updated)`)
- Modify: `api/payplus-return.ts` (same spot, line ~96)
- Modify: `api/simulate-payment.ts` (after its `sendOrderConfirmationEmail` call)
- Env: `ORDER_ALERT_EMAILS` in `.env` and Vercel (all environments)

**Interfaces:**
- Consumes: `parseAlertEmails`, `collectLowStockForOrder`, `stampLowStockAlerted`, `itemTitle`, `LowStockItem` (Task 4); `orders.admin_notified_at` (Task 1).
- Produces:
  - `AdminOrderEmailPayload` and `buildAdminOrderSubject(payload)`, `buildAdminOrderText(payload)`, `buildAdminOrderHtml(payload)`, `sendNewOrderAdminEmail(payload)` in `newOrderAdminEmail.ts`.
  - `notifyOwnersOfPaidOrder(supabase, orderId, siteUrl): Promise<void>` in `orderPayment.ts` — never throws, sends once.

- [ ] **Step 1: Write the failing tests**

`api/_lib/newOrderAdminEmail.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildAdminOrderSubject,
  buildAdminOrderText,
  type AdminOrderEmailPayload,
} from "./newOrderAdminEmail.js";

const base: AdminOrderEmailPayload = {
  to: ["eden@mothersday.co.il", "oron@mothersday.co.il"],
  orderNumber: 1042,
  customerName: "דנה כהן",
  customerEmail: "dana@example.com",
  customerPhone: "+972501234567",
  city: "תל אביב",
  items: [
    { title: "מארז יין", quantity: 1, price: 180, parts: [{ title: "תכנון ארוחות משפחתי שבועי", quantity: 1 }, { title: "בלוק תכנון גדול", quantity: 1 }] },
    { title: "מחברת שורות קטנה", quantity: 2, price: 45 },
  ],
  subtotal: 270,
  discountCode: "WELCOME10",
  discountAmount: 27,
  shippingCost: 0,
  total: 243,
  paymentMethod: "credit-card",
  cardLast4: "1234",
  adminUrl: "https://www.mothersday.co.il/admin/orders/abc",
  lowStock: [],
  simulated: false,
};

describe("buildAdminOrderSubject", () => {
  it("names the order, the customer and the total", () => {
    expect(buildAdminOrderSubject(base)).toBe("הזמנה חדשה #1042 · דנה כהן · ₪243");
  });
  it("marks simulated orders", () => {
    expect(buildAdminOrderSubject({ ...base, simulated: true })).toBe("[בדיקה] הזמנה חדשה #1042 · דנה כהן · ₪243");
  });
});

describe("buildAdminOrderText", () => {
  it("lists items, kit parts, totals and the admin link", () => {
    const text = buildAdminOrderText(base);
    expect(text).toContain("1 × מארז יין");
    expect(text).toContain("  └ 1 × תכנון ארוחות משפחתי שבועי");
    expect(text).toContain("2 × מחברת שורות קטנה");
    expect(text).toContain("הנחה (WELCOME10): -₪27");
    expect(text).toContain("סה\"כ: ₪243");
    expect(text).toContain("https://www.mothersday.co.il/admin/orders/abc");
    expect(text).not.toContain("מלאי נמוך");
  });
  it("adds the low-stock section only when there are items", () => {
    const text = buildAdminOrderText({
      ...base,
      lowStock: [
        { kind: "variant", id: "v", title: "בלוק תכנון גדול", sku: "BLK-L", available: 0, threshold: 5, status: "out", blockedKits: ["מארז יין", "מארז בלוקים"] },
      ],
    });
    expect(text).toContain("מלאי נמוך");
    expect(text).toContain("בלוק תכנון גדול (BLK-L): נשארו 0 (סף 5) — חוסם: מארז יין, מארז בלוקים");
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npm test -- api/_lib/newOrderAdminEmail.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `api/_lib/newOrderAdminEmail.ts`**

```ts
import type { LowStockItem } from "./inventory.js";

/**
 * "הזמנה חדשה" email to the store owners (decision 7): one per paid order, to
 * ORDER_ALERT_EMAILS. Plain and dense — this is an operations email, not the
 * customer's branded one. When the order pushed items under their threshold,
 * the same email carries a מלאי נמוך section so the owners get one email, not two.
 */

export interface AdminOrderEmailItem {
  title: string;
  quantity: number;
  price: number;
  /** Kit parts, for the packer's eyes. */
  parts?: Array<{ title: string; quantity: number }>;
}

export interface AdminOrderEmailPayload {
  to: string[];
  orderNumber: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  city: string | null;
  items: AdminOrderEmailItem[];
  subtotal: number | null;
  discountCode: string | null;
  discountAmount: number;
  shippingCost: number;
  total: number;
  paymentMethod: string | null;
  cardLast4: string | null;
  adminUrl: string;
  lowStock: LowStockItem[];
  simulated: boolean;
}

const DEFAULT_FROM = "יום האם <orders@noreply.mothersday.co.il>";

const shekel = (n: number) => `₪${Number.isInteger(n) ? n : n.toFixed(2)}`;

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const buildAdminOrderSubject = (p: AdminOrderEmailPayload) =>
  `${p.simulated ? "[בדיקה] " : ""}הזמנה חדשה #${p.orderNumber} · ${p.customerName || p.customerEmail || "לקוחה"} · ${shekel(p.total)}`;

const lowStockLine = (i: LowStockItem) =>
  `${i.title}${i.sku ? ` (${i.sku})` : ""}: נשארו ${i.available} (סף ${i.threshold})` +
  (i.blockedKits.length ? ` — חוסם: ${i.blockedKits.join(", ")}` : "");

export const buildAdminOrderText = (p: AdminOrderEmailPayload): string => {
  const lines: string[] = [];
  lines.push(`הזמנה חדשה #${p.orderNumber}${p.simulated ? " (בדיקה)" : ""}`);
  lines.push("");
  lines.push(`לקוחה: ${p.customerName || "—"}`);
  if (p.customerEmail) lines.push(`אימייל: ${p.customerEmail}`);
  if (p.customerPhone) lines.push(`טלפון: ${p.customerPhone}`);
  if (p.city) lines.push(`עיר: ${p.city}`);
  lines.push("");
  lines.push("פריטים:");
  for (const item of p.items) {
    lines.push(`${item.quantity} × ${item.title} — ${shekel(item.price * item.quantity)}`);
    for (const part of item.parts ?? []) lines.push(`  └ ${part.quantity * item.quantity} × ${part.title}`);
  }
  lines.push("");
  if (p.subtotal !== null) lines.push(`סכום ביניים: ${shekel(p.subtotal)}`);
  if (p.discountAmount > 0) lines.push(`הנחה${p.discountCode ? ` (${p.discountCode})` : ""}: -${shekel(p.discountAmount)}`);
  lines.push(`משלוח: ${p.shippingCost > 0 ? shekel(p.shippingCost) : "חינם"}`);
  lines.push(`סה"כ: ${shekel(p.total)}`);
  if (p.paymentMethod || p.cardLast4) {
    lines.push(`תשלום: ${[p.paymentMethod, p.cardLast4 ? `•••• ${p.cardLast4}` : null].filter(Boolean).join(" ")}`);
  }
  if (p.lowStock.length) {
    lines.push("");
    lines.push("⚠ מלאי נמוך אחרי ההזמנה הזו:");
    for (const i of p.lowStock) lines.push(`- ${lowStockLine(i)}`);
  }
  lines.push("");
  lines.push(`לכרטיס ההזמנה: ${p.adminUrl}`);
  return lines.join("\n");
};

export const buildAdminOrderHtml = (p: AdminOrderEmailPayload): string => {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 8px;color:#8a7e74;white-space:nowrap">${label}</td><td style="padding:4px 8px">${value}</td></tr>`;
  const itemsHtml = p.items
    .map((item) => {
      const parts = (item.parts ?? [])
        .map((part) => `<div style="color:#8a7e74;font-size:13px;padding-right:14px">└ ${part.quantity * item.quantity} × ${escapeHtml(part.title)}</div>`)
        .join("");
      return `<tr><td style="padding:6px 8px;border-bottom:1px solid #ded8d1">${item.quantity} × ${escapeHtml(item.title)}${parts}</td><td style="padding:6px 8px;border-bottom:1px solid #ded8d1;white-space:nowrap">${shekel(item.price * item.quantity)}</td></tr>`;
    })
    .join("");
  const lowStockHtml = p.lowStock.length
    ? `<div style="margin:18px 0;padding:12px 14px;background:#f4dddb;border:1px solid #b23a3a;color:#4d3c40">
         <strong>⚠ מלאי נמוך אחרי ההזמנה הזו</strong>
         <ul style="margin:8px 0 0;padding-right:18px">${p.lowStock.map((i) => `<li>${escapeHtml(lowStockLine(i))}</li>`).join("")}</ul>
       </div>`
    : "";
  return `<!DOCTYPE html><html dir="rtl" lang="he"><body style="margin:0;padding:24px;background:#ece7e1;font-family:Assistant,Arial,sans-serif;color:#4d3c40">
  <div style="max-width:560px;margin:0 auto;background:#f8f6f2;border:1px solid #ded8d1;padding:20px 22px">
    <h1 style="font-size:20px;margin:0 0 14px">הזמנה חדשה #${p.orderNumber}${p.simulated ? " <span style=\"color:#b7791f\">(בדיקה)</span>" : ""}</h1>
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:14px">
      ${row("לקוחה", escapeHtml(p.customerName || "—"))}
      ${p.customerEmail ? row("אימייל", `<a href="mailto:${escapeHtml(p.customerEmail)}">${escapeHtml(p.customerEmail)}</a>`) : ""}
      ${p.customerPhone ? row("טלפון", `<span dir="ltr">${escapeHtml(p.customerPhone)}</span>`) : ""}
      ${p.city ? row("עיר", escapeHtml(p.city)) : ""}
    </table>
    <table style="border-collapse:collapse;width:100%;font-size:14px">${itemsHtml}</table>
    <table style="border-collapse:collapse;font-size:14px;margin-top:10px">
      ${p.subtotal !== null ? row("סכום ביניים", shekel(p.subtotal)) : ""}
      ${p.discountAmount > 0 ? row(`הנחה${p.discountCode ? ` (${escapeHtml(p.discountCode)})` : ""}`, `-${shekel(p.discountAmount)}`) : ""}
      ${row("משלוח", p.shippingCost > 0 ? shekel(p.shippingCost) : "חינם")}
      ${row("<strong>סה\"כ</strong>", `<strong>${shekel(p.total)}</strong>`)}
      ${p.paymentMethod || p.cardLast4 ? row("תשלום", escapeHtml([p.paymentMethod, p.cardLast4 ? `•••• ${p.cardLast4}` : null].filter(Boolean).join(" "))) : ""}
    </table>
    ${lowStockHtml}
    <p style="margin:18px 0 0"><a href="${escapeHtml(p.adminUrl)}" style="display:inline-block;padding:10px 16px;background:#4d3c40;color:#fff;text-decoration:none">לכרטיס ההזמנה</a></p>
  </div></body></html>`;
};

export const sendNewOrderAdminEmail = async (payload: AdminOrderEmailPayload) => {
  const resendApiKey = process.env.RESEND_API_KEY || process.env.resend_KEY;
  if (!resendApiKey) return { sent: false as const, reason: "missing_resend_api_key" };
  if (payload.to.length === 0) return { sent: false as const, reason: "no_recipients" };

  const from = process.env.ORDER_CONFIRMATION_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: payload.to,
        subject: buildAdminOrderSubject(payload),
        html: buildAdminOrderHtml(payload),
        text: buildAdminOrderText(payload),
        reply_to: payload.customerEmail ?? undefined,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to send new-order admin email:", errorText);
      return { sent: false as const, reason: errorText };
    }
    const data = (await response.json().catch(() => null)) as { id?: string } | null;
    return { sent: true as const, id: data?.id };
  } catch (error) {
    console.error("New-order admin email request failed:", error);
    return { sent: false as const, reason: error instanceof Error ? error.message : "unknown_error" };
  }
};
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- api/_lib/newOrderAdminEmail.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Add `notifyOwnersOfPaidOrder` to `api/_lib/orderPayment.ts`**

Add these imports at the top:

```ts
import { collectLowStockForOrder, itemTitle, parseAlertEmails, stampLowStockAlerted } from "./inventory.js";
import { sendNewOrderAdminEmail, type AdminOrderEmailItem } from "./newOrderAdminEmail.js";
```

Append this function at the end of the file:

```ts
/**
 * "הזמנה חדשה" to the owners (ORDER_ALERT_EMAILS), once per paid order
 * (orders.admin_notified_at). Carries the low-stock items this order caused,
 * then stamps them so they alert again only after a restock. Never throws.
 */
export async function notifyOwnersOfPaidOrder(
  supabase: SupabaseClient,
  orderId: string,
  siteUrl: string,
  options: { simulated?: boolean } = {},
): Promise<void> {
  try {
    const recipients = parseAlertEmails(process.env.ORDER_ALERT_EMAILS);
    if (recipients.length === 0) {
      console.warn("notifyOwnersOfPaidOrder: ORDER_ALERT_EMAILS is not set — no owners' email sent");
      return;
    }

    const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (!order || order.financial_status !== "paid" || order.admin_notified_at) return;

    const lineItems = (Array.isArray(order.line_items) ? order.line_items : []) as Array<{
      title?: string; quantity?: number; price?: string | number; product_id?: string;
    }>;

    // Kit recipes for the packer's eyes (one query for all kits in the order).
    const productIds = [...new Set(lineItems.map((i) => i.product_id).filter((id): id is string => Boolean(id)))];
    const { data: kitRows } = productIds.length
      ? await supabase
          .from("bundle_items")
          .select("bundle_id, quantity, product:product_id(title)")
          .in("bundle_id", productIds)
      : { data: [] as unknown[] };
    const partsByKit = new Map<string, Array<{ title: string; quantity: number }>>();
    for (const row of (kitRows ?? []) as Array<{ bundle_id: string; quantity: number | null; product: { title: string } | { title: string }[] | null }>) {
      const product = Array.isArray(row.product) ? row.product[0] : row.product;
      if (!product) continue;
      partsByKit.set(row.bundle_id, [
        ...(partsByKit.get(row.bundle_id) ?? []),
        { title: product.title, quantity: row.quantity ?? 1 },
      ]);
    }

    const items: AdminOrderEmailItem[] = lineItems.map((i) => ({
      title: i.title || "פריט",
      quantity: Math.max(1, Math.trunc(i.quantity ?? 1)),
      price: Number(i.price ?? 0),
      parts: i.product_id ? partsByKit.get(i.product_id) : undefined,
    }));

    const lowStock = await collectLowStockForOrder(supabase, orderId);
    const address = (order.shipping_address ?? {}) as { full_name?: string; phone?: string; city?: string };

    const result = await sendNewOrderAdminEmail({
      to: recipients,
      orderNumber: order.order_number,
      customerName: address.full_name?.trim() || null,
      customerEmail: order.customer_email || order.guest_email || null,
      customerPhone: address.phone || null,
      city: address.city || null,
      items,
      subtotal: order.subtotal != null ? Number(order.subtotal) : null,
      discountCode: order.discount_code ?? null,
      discountAmount: Number(order.discount_amount ?? 0),
      shippingCost: Number(order.shipping_cost ?? 0),
      total: Number(order.paid_amount ?? order.total_price),
      paymentMethod: order.payment_method ?? null,
      cardLast4: order.card_last4 ?? null,
      adminUrl: `${siteUrl}/admin/orders/${order.id}`,
      lowStock,
      simulated: Boolean(options.simulated),
    });

    if (result.sent) {
      await supabase
        .from("orders")
        .update({ admin_notified_at: new Date().toISOString() })
        .eq("id", orderId)
        .is("admin_notified_at", null);
      if (lowStock.length) await stampLowStockAlerted(supabase, lowStock);
    } else {
      console.error("Owners' new-order email not sent:", orderId, result.reason);
    }
  } catch (error) {
    console.error("notifyOwnersOfPaidOrder failed:", orderId, error);
  }
}
```

(`itemTitle` is imported for the kit-part titles if you later switch to variant-level titles; remove the import if eslint flags it unused.)

- [ ] **Step 6: Wire the three paid paths**

`api/payplus-callback.ts` — extend the import and the `if (result.updated)` block:

```ts
import { createAndStoreInvoice, markOrderPaid, notifyOwnersOfPaidOrder, PermanentPaymentError, sendPaidOrderEmail } from "./_lib/orderPayment.js";
```
```ts
    if (result.updated) {
      // Invoice+ "api" mode: issue the document now so the email can link it.
      await createAndStoreInvoice(supabase, orderId);
      await sendPaidOrderEmail(supabase, orderId, getPaymentBaseUrl(req));
      await notifyOwnersOfPaidOrder(supabase, orderId, getPaymentBaseUrl(req));
    }
```

`api/payplus-return.ts` — same import change; after `await sendPaidOrderEmail(supabase, orderId, base);` add `await notifyOwnersOfPaidOrder(supabase, orderId, base);`.

`api/simulate-payment.ts` — add `import { notifyOwnersOfPaidOrder } from "./_lib/orderPayment.js";` and, after the block that awaits `sendOrderConfirmationEmail(...)`, add:

```ts
  await notifyOwnersOfPaidOrder(supabase, order.id, siteUrl, { simulated: true });
```
(`supabase` and `siteUrl` are the names already used in that file for the service client and the resolved base URL; if the file names them differently, use its names.)

- [ ] **Step 7: Env var**

Local: append `ORDER_ALERT_EMAILS=eden@mothersday.co.il,oron@mothersday.co.il` to `.env`.
Vercel (run once per environment, paste the same value):
```bash
printf 'eden@mothersday.co.il,oron@mothersday.co.il' | vercel env add ORDER_ALERT_EMAILS production
printf 'eden@mothersday.co.il,oron@mothersday.co.il' | vercel env add ORDER_ALERT_EMAILS preview
printf 'eden@mothersday.co.il,oron@mothersday.co.il' | vercel env add ORDER_ALERT_EMAILS development
```
Also add the variable to the "Server" list in `CLAUDE.md` → Environment variables (Task 13 collects doc edits; note it now).

- [ ] **Step 8: Type-check, lint, test**

Run: `npx tsc --noEmit -p tsconfig.node.json 2>&1 | grep -E "api/(_lib/(orderPayment|newOrderAdminEmail)|payplus-callback|payplus-return|simulate-payment)"; npx eslint api/_lib/orderPayment.ts api/_lib/newOrderAdminEmail.ts api/payplus-callback.ts api/payplus-return.ts api/simulate-payment.ts; npm test`
Expected: no grep output; eslint clean; all tests pass.

- [ ] **Step 9: Verify on the preview with the simulator**

Push, then on the preview site (with `VITE_PAYMENT_SIMULATION_ENABLED`/`PAYMENT_SIMULATION_ENABLED` true in Preview) place a small order for a kit and complete the simulated payment. Expected: both inboxes receive "[בדיקה] הזמנה חדשה #…" with the kit's parts listed; `SELECT admin_notified_at FROM orders WHERE order_number=<n>` is set; a second simulate call for the same order sends nothing.

- [ ] **Step 10: Commit**

```bash
git add api/_lib/newOrderAdminEmail.ts api/_lib/newOrderAdminEmail.test.ts api/_lib/orderPayment.ts api/payplus-callback.ts api/payplus-return.ts api/simulate-payment.ts
git commit -m "Owners' new-order email on every paid order, with folded low-stock section

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Storefront availability (`sellable`, `maxOrderable`)

**Files:**
- Modify: `src/lib/types.ts:17-23` (`ProductVariant`)
- Create: `src/lib/availability.ts`
- Create: `src/lib/availability.test.ts`
- Modify: `src/lib/api.ts` (`toProductEdgesWithBundles` at line ~101, `getProductByHandle` at line ~172, imports)

**Interfaces:**
- Consumes: public view `storefront_availability`.
- Produces:
  - `ProductVariant.maxOrderable?: number | null`
  - `AvailabilityRow { product_id; variant_id; sellable: boolean; max_orderable: number | null }`
  - `fetchAvailability(productIds: string[]): Promise<Map<string, AvailabilityRow>>` (keyed by variant id; fails open with an empty map)
  - `applyAvailability(edges: ProductEdge[], map): ProductEdge[]` (pure)
  - `cartItemMaxQuantity(item: CartItem): number` (pure; min of `MAX_ITEM_QUANTITY` and the variant's `maxOrderable`)
  - `variantMaxQuantity(maxOrderable: number | null | undefined): number` (pure)

- [ ] **Step 1: Extend the type**

In `src/lib/types.ts` add to `ProductVariant` after `availableForSale: boolean;`:

```ts
  /** From storefront_availability: how many a customer may order right now. null = no limit. */
  maxOrderable?: number | null;
```

- [ ] **Step 2: Write the failing tests**

`src/lib/availability.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ supabase: {} }));

import { applyAvailability, cartItemMaxQuantity, variantMaxQuantity, type AvailabilityRow } from "./availability";
import type { CartItem, ProductEdge } from "./types";

const variant = (id: string, availableForSale = true) => ({
  node: { id, title: "Default Title", price: { amount: "10", currencyCode: "ILS" }, availableForSale, selectedOptions: [] },
});

const edge = (productId: string, variantIds: string[]): ProductEdge =>
  ({ node: { id: productId, title: "t", variants: { edges: variantIds.map((v) => variant(v)) } } }) as unknown as ProductEdge;

describe("applyAvailability", () => {
  it("returns the same edges when the map is empty (fail open)", () => {
    const edges = [edge("p1", ["v1"])];
    expect(applyAvailability(edges, new Map())).toBe(edges);
  });
  it("turns sellable=false into availableForSale=false and copies max_orderable", () => {
    const map = new Map<string, AvailabilityRow>([
      ["v1", { product_id: "p1", variant_id: "v1", sellable: false, max_orderable: 0 }],
      ["v2", { product_id: "p1", variant_id: "v2", sellable: true, max_orderable: 3 }],
    ]);
    const [out] = applyAvailability([edge("p1", ["v1", "v2", "v3"])], map);
    const nodes = out.node.variants.edges.map((e) => e.node);
    expect(nodes[0].availableForSale).toBe(false);
    expect(nodes[0].maxOrderable).toBe(0);
    expect(nodes[1].availableForSale).toBe(true);
    expect(nodes[1].maxOrderable).toBe(3);
    expect(nodes[2].availableForSale).toBe(true); // not in the map → untouched
    expect(nodes[2].maxOrderable).toBeUndefined();
  });
  it("never re-enables a variant the admin switched off", () => {
    const map = new Map<string, AvailabilityRow>([["v1", { product_id: "p1", variant_id: "v1", sellable: true, max_orderable: null }]]);
    const e = edge("p1", ["v1"]);
    e.node.variants.edges[0].node.availableForSale = false;
    expect(applyAvailability([e], map)[0].node.variants.edges[0].node.availableForSale).toBe(false);
  });
});

describe("max quantities", () => {
  it("caps at MAX_ITEM_QUANTITY when there is no stock limit", () => {
    expect(variantMaxQuantity(null)).toBe(20);
    expect(variantMaxQuantity(undefined)).toBe(20);
    expect(variantMaxQuantity(50)).toBe(20);
    expect(variantMaxQuantity(3)).toBe(3);
    expect(variantMaxQuantity(0)).toBe(0);
  });
  it("reads the cart item's variant", () => {
    const e = edge("p1", ["v1"]);
    e.node.variants.edges[0].node.maxOrderable = 2;
    const item = { product: e, variantId: "v1", quantity: 1 } as unknown as CartItem;
    expect(cartItemMaxQuantity(item)).toBe(2);
    expect(cartItemMaxQuantity({ ...item, variantId: "missing" } as CartItem)).toBe(20);
  });
});
```

- [ ] **Step 3: Run to see them fail**

Run: `npm test -- src/lib/availability.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Write `src/lib/availability.ts`**

```ts
import { supabase } from './supabase';
import { MAX_ITEM_QUANTITY } from './checkoutConfig';
import type { CartItem, ProductEdge } from './types';

/**
 * Storefront stock awareness. The database decides (spec §4.2); the storefront
 * only learns two things per variant: can it be sold, and how many at most.
 * Exact stock numbers never reach the browser.
 */

export interface AvailabilityRow {
  product_id: string;
  variant_id: string;
  sellable: boolean;
  max_orderable: number | null;
}

export const AVAILABILITY_QUERY_KEY = 'storefront-availability';

/** variant_id → row. Fails OPEN: any error yields an empty map and everything stays sellable. */
export async function fetchAvailability(productIds: string[]): Promise<Map<string, AvailabilityRow>> {
  const map = new Map<string, AvailabilityRow>();
  const ids = [...new Set(productIds)].filter(Boolean);
  if (ids.length === 0) return map;
  const { data, error } = await supabase
    .from('storefront_availability')
    .select('product_id, variant_id, sellable, max_orderable')
    .in('product_id', ids);
  if (error) {
    console.warn('storefront_availability unavailable, failing open:', error.message);
    return map;
  }
  for (const row of (data ?? []) as AvailabilityRow[]) map.set(row.variant_id, row);
  return map;
}

/** Pure. Variants missing from the map are left untouched; a manual "off" is never re-enabled. */
export function applyAvailability(edges: ProductEdge[], map: Map<string, AvailabilityRow>): ProductEdge[] {
  if (map.size === 0) return edges;
  return edges.map((edge) => ({
    node: {
      ...edge.node,
      variants: {
        edges: edge.node.variants.edges.map((v) => {
          const row = map.get(v.node.id);
          if (!row) return v;
          return {
            node: {
              ...v.node,
              availableForSale: v.node.availableForSale && row.sellable,
              maxOrderable: row.max_orderable,
            },
          };
        }),
      },
    },
  }));
}

/** The most a customer may add of a variant: stock limit if known, else the order API's cap. */
export function variantMaxQuantity(maxOrderable: number | null | undefined): number {
  if (maxOrderable === null || maxOrderable === undefined) return MAX_ITEM_QUANTITY;
  return Math.max(0, Math.min(MAX_ITEM_QUANTITY, maxOrderable));
}

export function cartItemMaxQuantity(item: CartItem): number {
  const node = item.product.node.variants.edges.find((e) => e.node.id === item.variantId)?.node;
  return variantMaxQuantity(node?.maxOrderable);
}
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- src/lib/availability.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Wire `src/lib/api.ts`**

Add the import near the top:

```ts
import { applyAvailability, fetchAvailability } from './availability';
```

Replace `toProductEdgesWithBundles`:

```ts
/** Wraps product rows into ProductEdges: kit contents for kit rows, live availability for every variant. */
async function toProductEdgesWithBundles(rows: any[]): Promise<ProductEdge[]> {
  const bundleIds = rows.filter((r) => r.is_bundle).map((r) => r.id);
  const [contentsMap, availability] = await Promise.all([
    getBundleContentsMap(bundleIds),
    fetchAvailability(rows.map((r) => r.id)),
  ]);
  const edges = rows.map((row) => ({ node: transformProduct(row, contentsMap[row.id]) }));
  return applyAvailability(edges, availability);
}
```

In `getProductByHandle`, replace `const product = transformProduct(data);` with:

```ts
    const availability = await fetchAvailability([data.id]);
    const product = applyAvailability([{ node: transformProduct(data) }], availability)[0].node;
```

- [ ] **Step 7: Type-check, lint, smoke**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "src/lib/(api|availability|types)"; npx eslint src/lib/availability.ts src/lib/availability.test.ts src/lib/api.ts src/lib/types.ts`
Expected: no output, eslint clean.

Smoke: `npm run dev`, open http://localhost:8080/products — cards render as before (nothing is tracked yet). In the browser devtools Network tab confirm one request to `storefront_availability` per product query.

- [ ] **Step 8: Commit**

```bash
git add src/lib/types.ts src/lib/availability.ts src/lib/availability.test.ts src/lib/api.ts
git commit -m "Storefront: sellable + maxOrderable from storefront_availability

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Quantity caps, cart clamp, checkout message

**Files:**
- Modify: `src/hooks/useAddToCart.ts` (`VariantNode`, `incrementQuantity`, validation, return value)
- Modify: `src/pages/ProductDetail.tsx` (`handleQuantityChange` ~line 191, the two `+` buttons ~lines 381 and 623)
- Modify: `src/components/QuickViewModal.tsx` (the `+` button ~line 176)
- Modify: `src/components/CartDrawer.tsx` (~lines 94-100), `src/components/checkout/CheckoutSummary.tsx` (~lines 210-216)
- Create: `src/hooks/useCartStockClamp.ts`
- Modify: `src/components/checkout/CheckoutSummary.tsx` (mount the clamp hook)
- Modify: `src/pages/Checkout.tsx` (`describeOrderError`, line ~106)

**Interfaces:**
- Consumes: `variantMaxQuantity`, `cartItemMaxQuantity`, `fetchAvailability`, `AVAILABILITY_QUERY_KEY` (Task 7); `insufficient_stock` (Task 5).
- Produces: `useAddToCart` returns `maxQuantity`; `useCartStockClamp()` hook.

- [ ] **Step 1: `useAddToCart` — cap at the variant's limit**

Add to the imports: `import { variantMaxQuantity } from "@/lib/availability";`

Add `maxOrderable?: number | null;` to `VariantNode`.

Inside the hook, before `handleAddToCart`, add:

```ts
  const maxQuantity = variantMaxQuantity(variant?.maxOrderable);
```

In `handleAddToCart`, after the `qtyToAdd < 1` validation block, add:

```ts
          if (qtyToAdd > maxQuantity) {
            toast.error("אין מספיק במלאי", {
              description: maxQuantity === 0 ? "המוצר אזל מהמלאי" : `נשארו ${maxQuantity} יחידות בלבד`,
              position: "top-center",
            });
            return false;
          }
```
and add `maxQuantity` to the `useCallback` dependency array.

Replace `incrementQuantity`:

```ts
  const incrementQuantity = useCallback(() => {
    // Stock limit when known, else the per-line cap enforced by /api/create-order.
    setQuantity((prev) => Math.min(prev + 1, Math.max(1, maxQuantity)));
  }, [maxQuantity]);
```

Return `maxQuantity` alongside the other fields.

- [ ] **Step 2: `ProductDetail.tsx` — same cap on the page's own stepper**

Add the import: `import { variantMaxQuantity } from '@/lib/availability';`

Right after the line that defines `selectedVariant` (search for `const selectedVariant`), add:

```ts
  const maxQuantity = Math.max(1, variantMaxQuantity(selectedVariant?.maxOrderable));
  useEffect(() => {
    setQuantity((q) => Math.min(q, maxQuantity));
  }, [maxQuantity]);
```

Replace `handleQuantityChange`:

```ts
  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.min(maxQuantity, Math.max(1, prev + delta)));
  };
```

On both `+` buttons (desktop block and the mobile sticky bar) add:

```tsx
                    disabled={quantity >= maxQuantity}
                    title={quantity >= maxQuantity ? `אפשר להזמין עד ${maxQuantity} יחידות` : undefined}
```
and append ` disabled:opacity-40 disabled:cursor-not-allowed` to each button's `className`.

- [ ] **Step 3: `QuickViewModal.tsx`**

Destructure `maxQuantity` from `useAddToCart(...)` and give its `+` button the same `disabled`/`title`/class additions as Step 2 (`quantity >= maxQuantity`).

- [ ] **Step 4: Cart drawer and checkout summary `+` buttons**

In both files import `cartItemMaxQuantity` from `@/lib/availability`. Replace the `MAX_ITEM_QUANTITY` comparisons on the `+` button with a per-item max:

```tsx
                            disabled={item.quantity >= cartItemMaxQuantity(item)}
                            title={item.quantity >= cartItemMaxQuantity(item)
                              ? (cartItemMaxQuantity(item) < MAX_ITEM_QUANTITY ? `נשארו ${cartItemMaxQuantity(item)} יחידות במלאי` : MAX_ITEM_QUANTITY_MESSAGE)
                              : undefined}
```
Apply the same replacement to the `aria-label`/text that currently reads `MAX_ITEM_QUANTITY_MESSAGE` under the same condition (lines ~98-100 in CartDrawer, ~215-217 in CheckoutSummary).

- [ ] **Step 5: Clamp the cart to live stock when checkout opens**

Create `src/hooks/useCartStockClamp.ts`:

```ts
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCartStore } from '@/stores/cartStore';
import { AVAILABILITY_QUERY_KEY, fetchAvailability, variantMaxQuantity } from '@/lib/availability';

/**
 * On the checkout page: re-read availability for the cart's products and pull
 * quantities down to what can still be ordered (0 → the line is removed), so the
 * customer sees the limit before /api/create-order refuses the order.
 */
export function useCartStockClamp() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const productIds = [...new Set(items.map((i) => i.product.node.id))].sort();
  const announced = useRef(false);

  const query = useQuery({
    queryKey: [AVAILABILITY_QUERY_KEY, productIds],
    queryFn: () => fetchAvailability(productIds),
    enabled: productIds.length > 0,
    staleTime: 30_000,
  });

  useEffect(() => {
    const map = query.data;
    if (!map || map.size === 0) return;
    let changed = false;
    for (const item of items) {
      const row = map.get(item.variantId);
      if (!row) continue;
      const max = row.sellable ? variantMaxQuantity(row.max_orderable) : 0;
      if (item.quantity > max) {
        changed = true;
        if (max <= 0) removeItem(item.variantId);
        else updateQuantity(item.variantId, max);
      }
    }
    if (changed && !announced.current) {
      announced.current = true;
      toast.warning('עדכנו את הכמויות לפי המלאי הזמין', {
        description: 'חלק מהפריטים אזלו או שנשארו מהם פחות יחידות.',
      });
    }
  }, [query.data, items, updateQuantity, removeItem]);

  return query;
}
```

In `CheckoutSummary.tsx`, import it and call `useCartStockClamp();` at the top of the component body (after the existing hooks).

- [ ] **Step 6: Checkout error copy**

In `src/pages/Checkout.tsx` `describeOrderError`, before the `if (haystack.includes("quantity"))` line add:

```ts
  if (code === "insufficient_stock") {
    // The server message already names the item and what is left (Hebrew).
    return `${message}. יש לעדכן את הכמות בסיכום ההזמנה ולנסות שוב.`;
  }
```

- [ ] **Step 7: Type-check, lint, manual check**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "useAddToCart|ProductDetail|QuickViewModal|CartDrawer|CheckoutSummary|useCartStockClamp|pages/Checkout"; npx eslint src/hooks/useAddToCart.ts src/hooks/useCartStockClamp.ts src/pages/ProductDetail.tsx src/components/QuickViewModal.tsx src/components/CartDrawer.tsx src/components/checkout/CheckoutSummary.tsx src/pages/Checkout.tsx`
Expected: no output, eslint clean.

Manual (`npm run dev`, against the linked database): track a variant at 2 with psql (`SELECT inv_apply(v.id,NULL,NULL,2,'count',NULL,'ui test',NULL,NULL) FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.handle='בלוק-תכנון-קטן';`). On its product page the `+` button stops at 2; add 2 to the cart; set the count to 1 with psql; open /checkout → toast "עדכנו את הכמויות…" and the line shows 1. Set the count to 0 → the product page button reads "אזל מהמלאי" and the kits containing it (מארז בלוקים, מארז אבן) read sold out on /sets. Clean up: delete the test level row and its `ui test` movements as in Task 5.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useAddToCart.ts src/hooks/useCartStockClamp.ts src/pages/ProductDetail.tsx src/components/QuickViewModal.tsx src/components/CartDrawer.tsx src/components/checkout/CheckoutSummary.tsx src/pages/Checkout.tsx
git commit -m "Storefront: quantity steppers and cart follow live stock; insufficient_stock copy

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: SEO prerender reads availability

**Files:**
- Modify: `scripts/prerender-seo.ts` (`ProductRow` type ~line 30-45, `fetchProducts` select ~line 668, the two `available_for_sale` expressions ~lines 677 and 829, the main flow where `fetchProducts()` is awaited)

**Interfaces:**
- Consumes: public view `storefront_availability` (anon key).
- Produces: `ProductRow.sellable?: boolean` computed once per product; both JSON-LD availability sites read it.

- [ ] **Step 1: Add `id` to the variants select and a `sellable` field**

In `ProductRow`, change the `product_variants` element type to include `id: string;` and add `sellable?: boolean;` to the row type. In `fetchProducts`, change `product_variants(price,available_for_sale,sort_order)` to `product_variants(id,price,available_for_sale,sort_order)`.

- [ ] **Step 2: Fetch sellable variant ids (fails open)**

Add after `fetchProducts`:

```ts
/**
 * Variants the store will actually sell right now (stock-aware, kits from parts).
 * null = view unavailable → fall back to the manual available_for_sale switch.
 */
const fetchSellableVariantIds = async (): Promise<Set<string> | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("storefront_availability").select("variant_id, sellable");
  if (error) {
    console.warn("[prerender-seo] storefront_availability unavailable, using available_for_sale:", error.message);
    return null;
  }
  return new Set((data ?? []).filter((r) => r.sellable).map((r) => r.variant_id as string));
};

const markSellable = (products: ProductRow[], sellableIds: Set<string> | null): ProductRow[] =>
  products.map((product) => {
    const variants = product.product_variants ?? [];
    const sellable = sellableIds
      ? variants.length === 0 || variants.some((v) => sellableIds.has(v.id))
      : variants.length === 0 || variants.some((v) => v.available_for_sale !== false);
    return { ...product, sellable };
  });
```

In the main flow, where products are fetched (search for `await fetchProducts()`), change to:

```ts
  const [rawProducts, sellableIds] = await Promise.all([fetchProducts(), fetchSellableVariantIds()]);
  const products = markSellable(rawProducts, sellableIds);
```
(keep the variable name the rest of the script already uses for the product list).

- [ ] **Step 3: Use it at both JSON-LD sites**

Replace `const available = firstVariant?.available_for_sale !== false;` with `const available = product.sellable !== false;` and replace the ItemList expression `variants.length === 0 || variants.some((v) => v.available_for_sale)` with `product.sellable !== false` (the surrounding variable that holds the product row may be named differently there — use that name).

- [ ] **Step 4: Verify the build**

Run: `npx tsc --noEmit -p tsconfig.node.json 2>&1 | grep prerender-seo; npm run build 2>&1 | tail -15`
Expected: no tsc lines; the build ends with the prerender summary and `dist/product/<handle>/index.html` files contain `"availability":"https://schema.org/InStock"` for every active product (`grep -l OutOfStock dist/product/*/index.html` prints nothing while nothing is tracked).

- [ ] **Step 5: Commit**

```bash
git add scripts/prerender-seo.ts
git commit -m "SEO prerender: InStock/OutOfStock from storefront_availability

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Admin inventory helpers + adjust dialog

**Files:**
- Create: `src/components/admin/adminInventory.ts`
- Create: `src/components/admin/adminInventory.test.ts`
- Create: `src/components/admin/InventoryAdjustDialog.tsx`

**Interfaces:**
- Consumes: views `variant_stock`, `supply_stock`, `kit_stock`, `inventory_movement_log`; RPC `record_inventory_movements`.
- Produces (from `adminInventory.ts`): `StockStatus`, `MovementReason`, `VariantStockRow`, `SupplyStockRow`, `KitStockRow`, `MovementLogRow`, `MovementInput`, `MOVEMENT_REASON_LABELS`, `stockStatusBadge()`, `sortByUrgency()`, `variantDisplayTitle()`, `formatDelta()`, `movementsToCsv()`, `recordMovements()`, `INVENTORY_QUERY_KEY`.
- Produces: `<InventoryAdjustDialog open onOpenChange target mode onDone />` with `target: { kind: 'variant' | 'supply'; id: string; title: string; onHand: number | null } | null` and `mode: 'receive' | 'count' | 'adjust'`.

- [ ] **Step 1: Write the failing tests**

`src/components/admin/adminInventory.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import {
  formatDelta, movementsToCsv, sortByUrgency, stockStatusBadge, variantDisplayTitle, type MovementLogRow,
} from "./adminInventory";

describe("stockStatusBadge", () => {
  it("maps every status to Hebrew", () => {
    expect(stockStatusBadge("ok").label).toBe("תקין");
    expect(stockStatusBadge("low").label).toBe("נמוך");
    expect(stockStatusBadge("out").label).toBe("אזל");
    expect(stockStatusBadge("short").label).toBe("חוסר");
    expect(stockStatusBadge("untracked").label).toBe("לא במעקב");
  });
});

describe("sortByUrgency", () => {
  it("puts short, out, low before ok and untracked, then by title", () => {
    const rows = [
      { status: "ok", title: "ב" }, { status: "untracked", title: "א" }, { status: "low", title: "ג" },
      { status: "short", title: "ד" }, { status: "out", title: "ה" }, { status: "ok", title: "א" },
    ] as const;
    expect(sortByUrgency([...rows], (r) => r.title).map((r) => `${r.status}:${r.title}`)).toEqual([
      "short:ד", "out:ה", "low:ג", "ok:א", "ok:ב", "untracked:א",
    ]);
  });
});

describe("variantDisplayTitle", () => {
  it("hides the default variant title", () => {
    expect(variantDisplayTitle({ product_title: "לוח שבועי", variant_title: "Default Title" })).toBe("לוח שבועי");
    expect(variantDisplayTitle({ product_title: "לוח משפחתי שבועי", variant_title: "ריפיל — דפים בלבד" })).toBe("לוח משפחתי שבועי · ריפיל — דפים בלבד");
  });
});

describe("formatDelta", () => {
  it("signs positives", () => {
    expect(formatDelta(3)).toBe("+3");
    expect(formatDelta(-2)).toBe("−2");
  });
});

describe("movementsToCsv", () => {
  it("writes a header, quotes fields with commas or quotes", () => {
    const row: MovementLogRow = {
      id: 1, created_at: "2026-09-06T08:00:00Z", delta: -2, on_hand_after: 5, reason: "sale", order_id: "o",
      reference: null, note: 'הערה, עם "מרכאות"', variant_id: "v", supply_id: null, item_kind: "variant",
      item_title: "מחברת שורות קטנה", sku: "NB-S", order_number: 1042, actor_email: null,
    };
    const csv = movementsToCsv([row]);
    const [header, line] = csv.split("\n");
    expect(header).toBe("תאריך,פריט,מק\"ט,שינוי,מלאי אחרי,סיבה,הזמנה,אסמכתא,הערה,בוצע על ידי");
    expect(line).toContain('"הערה, עם ""מרכאות"""');
    expect(line).toContain("מכירה");
    expect(line).toContain("1042");
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npm test -- src/components/admin/adminInventory.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/components/admin/adminInventory.ts`**

```ts
// Shared types and helpers for the admin inventory screens (מלאי).
// Rows come from the staff views created in 20260906090200_inventory_views.sql.
import { supabase } from '@/lib/supabase';

export type StockStatus = 'ok' | 'low' | 'out' | 'short' | 'untracked';
export type MovementReason = 'sale' | 'return' | 'consume' | 'receive' | 'count' | 'adjust' | 'damage' | 'gift';

export interface VariantStockRow {
  variant_id: string;
  product_id: string;
  product_title: string;
  product_handle: string;
  product_status: 'active' | 'draft';
  variant_title: string | null;
  sku: string | null;
  available_for_sale: boolean;
  image_url: string | null;
  on_hand: number | null;
  reserved: number;
  available: number | null;
  threshold: number;
  own_threshold: number | null;
  policy: 'deny' | 'continue' | null;
  low_stock_alerted_at: string | null;
  updated_at: string | null;
  is_tracked: boolean;
  status: StockStatus;
  last_movement_at: string | null;
}

export interface SupplyStockRow {
  supply_id: string;
  name: string;
  sku: string | null;
  on_hand: number;
  consumption_mode: 'per_order' | 'per_item' | 'manual';
  quantity_per_use: number;
  is_active: boolean;
  threshold: number;
  own_threshold: number | null;
  low_stock_alerted_at: string | null;
  updated_at: string | null;
  status: Exclude<StockStatus, 'untracked'>;
  last_movement_at: string | null;
}

export interface KitStockRow {
  bundle_id: string;
  bundle_title: string;
  bundle_handle: string;
  product_status: 'active' | 'draft';
  can_build: number | null;
  limiting_variant_id: string | null;
  limiting_title: string | null;
}

export interface MovementLogRow {
  id: number;
  created_at: string;
  delta: number;
  on_hand_after: number;
  reason: MovementReason;
  order_id: string | null;
  reference: string | null;
  note: string | null;
  variant_id: string | null;
  supply_id: string | null;
  item_kind: 'variant' | 'supply';
  item_title: string;
  sku: string | null;
  order_number: number | null;
  actor_email: string | null;
}

export interface MovementInput {
  variant_id?: string;
  supply_id?: string;
  delta?: number;
  set_to?: number;
  reason: MovementReason;
  order_id?: string;
  reference?: string;
  note?: string;
}

export const INVENTORY_QUERY_KEY = ['admin', 'inventory'] as const;

export const MOVEMENT_REASON_LABELS: Record<MovementReason, string> = {
  sale: 'מכירה',
  return: 'החזרה',
  consume: 'צריכה (אריזה)',
  receive: 'קליטה',
  count: 'ספירה',
  adjust: 'התאמה',
  damage: 'פגום',
  gift: 'מתנה / דוגמה',
};

export const CONSUMPTION_MODE_LABELS: Record<SupplyStockRow['consumption_mode'], string> = {
  per_order: 'לכל הזמנה',
  per_item: 'לכל פריט',
  manual: 'ידני',
};

const STATUS_BADGES: Record<StockStatus, { label: string; className: string }> = {
  ok: { label: 'תקין', className: 'bg-green-500/20 text-green-700' },
  low: { label: 'נמוך', className: 'bg-yellow-500/20 text-yellow-700' },
  out: { label: 'אזל', className: 'bg-destructive/15 text-destructive' },
  short: { label: 'חוסר', className: 'bg-destructive text-destructive-foreground' },
  untracked: { label: 'לא במעקב', className: 'bg-muted text-muted-foreground' },
};

export const stockStatusBadge = (status: StockStatus) => STATUS_BADGES[status] ?? STATUS_BADGES.untracked;

const STATUS_ORDER: Record<StockStatus, number> = { short: 0, out: 1, low: 2, ok: 3, untracked: 4 };

/** Most urgent first, then by title (Hebrew collation). */
export function sortByUrgency<T extends { status: StockStatus }>(rows: T[], title: (row: T) => string): T[] {
  return [...rows].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || title(a).localeCompare(title(b), 'he'),
  );
}

const DEFAULT_VARIANT_TITLES = new Set(['Default Title', 'ברירת מחדל']);

export const variantDisplayTitle = (row: { product_title: string; variant_title: string | null }) =>
  row.variant_title && !DEFAULT_VARIANT_TITLES.has(row.variant_title)
    ? `${row.product_title} · ${row.variant_title}`
    : row.product_title;

/** "+3" / "−2" (typographic minus so RTL text keeps the sign visible). */
export const formatDelta = (delta: number) => (delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`);

const csvCell = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function movementsToCsv(rows: MovementLogRow[]): string {
  const header = ['תאריך', 'פריט', 'מק"ט', 'שינוי', 'מלאי אחרי', 'סיבה', 'הזמנה', 'אסמכתא', 'הערה', 'בוצע על ידי'];
  const lines = rows.map((r) =>
    [
      r.created_at, r.item_title, r.sku, r.delta, r.on_hand_after, MOVEMENT_REASON_LABELS[r.reason] ?? r.reason,
      r.order_number, r.reference, r.note, r.actor_email ?? 'מערכת',
    ].map(csvCell).join(','),
  );
  return [header.map(csvCell).join(','), ...lines].join('\n');
}

/** Calls the admin RPC. Resolves to the ids written (empty = nothing changed). Throws a Hebrew Error. */
export async function recordMovements(movements: MovementInput[]): Promise<number[]> {
  const { data, error } = await supabase.rpc('record_inventory_movements', { p_movements: movements });
  if (error) {
    if (error.code === '42501') throw new Error('אין הרשאה לעדכן מלאי');
    if (error.code === 'PGRST202') throw new Error('מיגרציית המלאי עדיין לא הופעלה במסד הנתונים');
    throw new Error(error.message || 'עדכון המלאי נכשל');
  }
  return (data ?? []) as number[];
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- src/components/admin/adminInventory.test.ts`
Expected: PASS (5 groups).

- [ ] **Step 5: Write `src/components/admin/InventoryAdjustDialog.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  INVENTORY_QUERY_KEY, MOVEMENT_REASON_LABELS, recordMovements, type MovementInput, type MovementReason,
} from './adminInventory';

export type AdjustMode = 'receive' | 'count' | 'adjust';

export interface AdjustTarget {
  kind: 'variant' | 'supply';
  id: string;
  title: string;
  onHand: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: AdjustTarget | null;
  mode: AdjustMode;
  onDone?: () => void;
}

const TITLES: Record<AdjustMode, string> = { receive: 'קליטת סחורה', count: 'ספירת מלאי', adjust: 'התאמת מלאי' };
const ADJUST_REASONS: MovementReason[] = ['adjust', 'damage', 'gift'];

/**
 * One item, one movement. receive = +n with a reference; count = "there are n on the
 * shelf" (the database computes the delta under lock); adjust = ±n with a reason and note.
 */
export const InventoryAdjustDialog = ({ open, onOpenChange, target, mode, onDone }: Props) => {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState('');
  const [direction, setDirection] = useState<'in' | 'out'>('out');
  const [reason, setReason] = useState<MovementReason>('adjust');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuantity(mode === 'count' && target?.onHand != null ? String(target.onHand) : '');
    setDirection('out');
    setReason('adjust');
    setReference(mode === 'count' ? `ספירה ${format(new Date(), 'dd/MM/yyyy')}` : '');
    setNote('');
  }, [open, mode, target]);

  const qty = Number(quantity);
  const qtyValid = Number.isInteger(qty) && (mode === 'count' ? qty >= 0 : qty > 0);
  const noteRequired = mode === 'adjust' && reason === 'adjust';
  const canSubmit = target && qtyValid && (!noteRequired || note.trim().length > 0) && !saving;

  const submit = async () => {
    if (!target || !canSubmit) return;
    const base = target.kind === 'variant' ? { variant_id: target.id } : { supply_id: target.id };
    let movement: MovementInput;
    if (mode === 'receive') movement = { ...base, delta: qty, reason: 'receive', reference: reference || undefined, note: note || undefined };
    else if (mode === 'count') movement = { ...base, set_to: qty, reason: 'count', reference: reference || undefined, note: note || undefined };
    else movement = { ...base, delta: direction === 'in' ? qty : -qty, reason, note: note || undefined };

    setSaving(true);
    try {
      const ids = await recordMovements([movement]);
      if (ids.length === 0) toast.info('אין שינוי — המלאי כבר עומד על הכמות הזו');
      else toast.success(`${TITLES[mode]} נרשמה: ${target.title}`);
      await queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      onDone?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'עדכון המלאי נכשל');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{TITLES[mode]}</DialogTitle>
          <DialogDescription>
            {target?.title}
            {target?.onHand != null && <> · במלאי כעת: <span className="font-mono">{target.onHand}</span></>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === 'adjust' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>כיוון</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as 'in' | 'out')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="out">הורדה מהמלאי (−)</SelectItem>
                    <SelectItem value="in">הוספה למלאי (+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>סיבה</Label>
                <Select value={reason} onValueChange={(v) => setReason(v as MovementReason)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ADJUST_REASONS.map((r) => <SelectItem key={r} value={r}>{MOVEMENT_REASON_LABELS[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="inv-qty">{mode === 'count' ? 'כמות שנספרה על המדף' : 'כמות'}</Label>
            <Input id="inv-qty" type="number" step="1" min={mode === 'count' ? 0 : 1} value={quantity}
              onChange={(e) => setQuantity(e.target.value)} dir="ltr" autoFocus />
            {mode === 'count' && target?.onHand != null && qtyValid && qty !== target.onHand && (
              <p className="text-xs text-muted-foreground">
                יירשם שינוי של {qty - target.onHand > 0 ? '+' : '−'}{Math.abs(qty - target.onHand)}
              </p>
            )}
          </div>

          {mode !== 'adjust' && (
            <div className="space-y-1">
              <Label htmlFor="inv-ref">{mode === 'receive' ? 'אסמכתא (חשבונית / משלוח)' : 'שם הספירה'}</Label>
              <Input id="inv-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="inv-note">הערה{noteRequired ? ' (חובה בהתאמה)' : ''}</Label>
            <Textarea id="inv-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button onClick={submit} disabled={!canSubmit}>
            {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            שמירה
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 6: Type-check, lint, commit**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "adminInventory|InventoryAdjustDialog"; npx eslint src/components/admin/adminInventory.ts src/components/admin/adminInventory.test.ts src/components/admin/InventoryAdjustDialog.tsx`
Expected: no output, eslint clean. (The dialog is exercised in Task 11.)

```bash
git add src/components/admin/adminInventory.ts src/components/admin/adminInventory.test.ts src/components/admin/InventoryAdjustDialog.tsx
git commit -m "Admin inventory: shared helpers, status badges, RPC wrapper, adjust dialog

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: `/admin/inventory` overview + navigation

**Files:**
- Create: `src/components/admin/InventoryOverview.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx:3-17` (icon import + `NAV_ITEMS`)
- Modify: `src/pages/AdminDashboard.tsx` (imports + two routes)

**Interfaces:**
- Consumes: `VariantStockRow`, `SupplyStockRow`, `KitStockRow`, `stockStatusBadge`, `sortByUrgency`, `variantDisplayTitle`, `INVENTORY_QUERY_KEY`, `CONSUMPTION_MODE_LABELS` (Task 10); `InventoryAdjustDialog` (Task 10).
- Produces: route `/admin/inventory` (this task) and `/admin/inventory/movements` (component in Task 12; the route is registered here and the movements screen links back).

- [ ] **Step 1: Write `src/components/admin/InventoryOverview.tsx`**

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, History } from 'lucide-react';
import { AdminErrorState } from './AdminErrorState';
import { InventoryAdjustDialog, type AdjustMode, type AdjustTarget } from './InventoryAdjustDialog';
import {
  CONSUMPTION_MODE_LABELS, INVENTORY_QUERY_KEY, sortByUrgency, stockStatusBadge, variantDisplayTitle,
  type KitStockRow, type StockStatus, type SupplyStockRow, type VariantStockRow,
} from './adminInventory';

type Filter = 'all' | 'attention' | 'untracked';
const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'הכל' },
  { value: 'attention', label: 'דורש טיפול' },
  { value: 'untracked', label: 'לא במעקב' },
];
const ATTENTION: StockStatus[] = ['short', 'out', 'low'];

const StatusBadge = ({ status }: { status: StockStatus }) => {
  const { label, className } = stockStatusBadge(status);
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{label}</span>;
};

const formatWhen = (value: string | null) =>
  value ? format(new Date(value), 'dd/MM HH:mm', { locale: he }) : '—';

const Num = ({ value, warn }: { value: number | null | undefined; warn?: boolean }) => (
  <span className={`font-mono tabular-nums ${warn ? 'text-destructive font-bold' : ''}`} dir="ltr">
    {value === null || value === undefined ? '—' : value}
  </span>
);

/** /admin/inventory — the morning screen: products, packaging supplies, and what kits can be built. */
export const InventoryOverview = () => {
  const [filter, setFilter] = useState<Filter>('all');
  const [dialog, setDialog] = useState<{ target: AdjustTarget; mode: AdjustMode } | null>(null);

  const variantsQuery = useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'variants'],
    queryFn: async (): Promise<VariantStockRow[]> => {
      const { data, error } = await supabase.from('variant_stock').select('*');
      if (error) throw error;
      return (data ?? []) as VariantStockRow[];
    },
  });
  const suppliesQuery = useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'supplies'],
    queryFn: async (): Promise<SupplyStockRow[]> => {
      const { data, error } = await supabase.from('supply_stock').select('*').order('name');
      if (error) throw error;
      return (data ?? []) as SupplyStockRow[];
    },
  });
  const kitsQuery = useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'kits'],
    queryFn: async (): Promise<KitStockRow[]> => {
      const { data, error } = await supabase.from('kit_stock').select('*').order('bundle_title');
      if (error) throw error;
      return (data ?? []) as KitStockRow[];
    },
  });

  if (variantsQuery.isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (variantsQuery.isError) {
    const code = (variantsQuery.error as { code?: string })?.code;
    return (
      <AdminErrorState
        error={variantsQuery.error}
        onRetry={() => variantsQuery.refetch()}
        title={code === '42P01' ? 'מסך המלאי דורש את מיגרציית המלאי (20260906090000…)' : 'לא הצלחנו לטעון את המלאי'}
      />
    );
  }

  const variants = sortByUrgency(variantsQuery.data ?? [], variantDisplayTitle).filter((row) => {
    if (filter === 'attention') return ATTENTION.includes(row.status);
    if (filter === 'untracked') return row.status === 'untracked';
    return true;
  });
  const supplies = sortByUrgency(suppliesQuery.data ?? [], (s) => s.name);
  const kits = kitsQuery.data ?? [];

  const openDialog = (target: AdjustTarget, mode: AdjustMode) => setDialog({ target, mode });
  const variantTarget = (row: VariantStockRow): AdjustTarget => ({
    kind: 'variant', id: row.variant_id, title: variantDisplayTitle(row), onHand: row.on_hand,
  });
  const supplyTarget = (row: SupplyStockRow): AdjustTarget => ({
    kind: 'supply', id: row.supply_id, title: row.name, onHand: row.on_hand,
  });

  const RowActions = ({ target, tracked }: { target: AdjustTarget; tracked: boolean }) =>
    tracked ? (
      <div className="flex gap-1 justify-end">
        <Button size="sm" variant="outline" onClick={() => openDialog(target, 'receive')}>קליטה</Button>
        <Button size="sm" variant="outline" onClick={() => openDialog(target, 'count')}>ספירה</Button>
        <Button size="sm" variant="ghost" onClick={() => openDialog(target, 'adjust')}>התאמה</Button>
      </div>
    ) : (
      <div className="flex justify-end">
        <Button size="sm" onClick={() => openDialog(target, 'count')}>התחלת מעקב</Button>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">מלאי</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/inventory/movements"><History className="w-4 h-4 ml-2" />יומן תנועות</Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Button key={f.value} size="sm" variant={filter === f.value ? 'default' : 'outline'} onClick={() => setFilter(f.value)}>
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">מוצרים</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {variants.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">אין פריטים בסינון הזה</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">מוצר</TableHead>
                  <TableHead className="text-right">מק"ט</TableHead>
                  <TableHead className="text-right">במלאי</TableHead>
                  <TableHead className="text-right">שמור</TableHead>
                  <TableHead className="text-right">זמין</TableHead>
                  <TableHead className="text-right">סף</TableHead>
                  <TableHead className="text-right">מצב</TableHead>
                  <TableHead className="text-right">תנועה אחרונה</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((row) => (
                  <TableRow key={row.variant_id} className={row.status === 'untracked' ? 'text-muted-foreground' : ''}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {row.image_url ? <img src={row.image_url} alt="" className="w-10 h-10 object-cover" /> : <div className="w-10 h-10 bg-muted" />}
                        <div>
                          <Link to={`/admin/products/${row.product_id}`} className="hover:underline">{variantDisplayTitle(row)}</Link>
                          {row.product_status === 'draft' && <span className="text-xs text-muted-foreground mr-2">· טיוטה</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs" dir="ltr">{row.sku ?? '—'}</TableCell>
                    <TableCell><Num value={row.on_hand} warn={(row.on_hand ?? 0) < 0} /></TableCell>
                    <TableCell><Num value={row.is_tracked ? row.reserved : null} /></TableCell>
                    <TableCell><Num value={row.available} warn={row.is_tracked && (row.available ?? 0) <= 0} /></TableCell>
                    <TableCell><Num value={row.is_tracked ? row.threshold : null} /></TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatWhen(row.last_movement_at)}</TableCell>
                    <TableCell><RowActions target={variantTarget(row)} tracked={row.is_tracked} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">חומרי אריזה</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {suppliesQuery.isError ? (
            <AdminErrorState error={suppliesQuery.error} onRetry={() => suppliesQuery.refetch()} title="לא הצלחנו לטעון חומרי אריזה" compact />
          ) : supplies.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              עדיין לא הוגדרו חומרי אריזה (קופסאות, נייר, כרטיסים). מוסיפים אותם במסך "חומרי אריזה".
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">פריט</TableHead>
                  <TableHead className="text-right">מק"ט</TableHead>
                  <TableHead className="text-right">במלאי</TableHead>
                  <TableHead className="text-right">סף</TableHead>
                  <TableHead className="text-right">צריכה</TableHead>
                  <TableHead className="text-right">מצב</TableHead>
                  <TableHead className="text-right">תנועה אחרונה</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplies.map((row) => (
                  <TableRow key={row.supply_id} className={row.is_active ? '' : 'text-muted-foreground'}>
                    <TableCell className="font-medium">{row.name}{!row.is_active && <span className="text-xs mr-2">· לא פעיל</span>}</TableCell>
                    <TableCell className="font-mono text-xs" dir="ltr">{row.sku ?? '—'}</TableCell>
                    <TableCell><Num value={row.on_hand} warn={row.on_hand <= 0} /></TableCell>
                    <TableCell><Num value={row.threshold} /></TableCell>
                    <TableCell className="text-sm">
                      {CONSUMPTION_MODE_LABELS[row.consumption_mode]}{row.quantity_per_use > 1 ? ` ×${row.quantity_per_use}` : ''}
                    </TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatWhen(row.last_movement_at)}</TableCell>
                    <TableCell><RowActions target={supplyTarget(row)} tracked /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">מארזים — כמה אפשר להרכיב</CardTitle></CardHeader>
        <CardContent>
          {kits.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">אין מארזים</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {kits.map((kit) => (
                <div key={kit.bundle_id} className="border border-border p-3">
                  <div className={`text-3xl font-bold font-mono tabular-nums ${kit.can_build === 0 ? 'text-destructive' : ''}`} dir="ltr">
                    {kit.can_build === null ? '∞' : kit.can_build}
                  </div>
                  <Link to={`/admin/bundles/${kit.bundle_id}`} className="font-medium hover:underline">{kit.bundle_title}</Link>
                  <div className="text-xs text-muted-foreground mt-1">
                    {kit.can_build === null ? 'אף רכיב לא במעקב' : `מגביל: ${kit.limiting_title ?? '—'}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <InventoryAdjustDialog
        open={dialog !== null}
        onOpenChange={(open) => { if (!open) setDialog(null); }}
        target={dialog?.target ?? null}
        mode={dialog?.mode ?? 'adjust'}
      />
    </div>
  );
};
```

- [ ] **Step 2: Sidebar and routes**

`src/components/admin/AdminSidebar.tsx`: add `Boxes` to the lucide import and insert after the מארזים entry:

```ts
  { to: '/admin/inventory', icon: Boxes, label: 'מלאי' },
```

`src/pages/AdminDashboard.tsx`: add imports

```ts
import { InventoryOverview } from '@/components/admin/InventoryOverview';
import { InventoryMovements } from '@/components/admin/InventoryMovements';
```
and routes after the `bundles/:id` route:

```tsx
        <Route path="inventory" element={<InventoryOverview />} />
        <Route path="inventory/movements" element={<InventoryMovements />} />
```
(Task 12 creates `InventoryMovements`; until then export a placeholder from that file — or do Task 12 before running the app.)

- [ ] **Step 3: Type-check, lint, manual check**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "InventoryOverview|AdminSidebar|AdminDashboard"; npx eslint src/components/admin/InventoryOverview.tsx src/components/admin/AdminSidebar.tsx src/pages/AdminDashboard.tsx`
Expected: no output, eslint clean.

Manual: `npm run dev`, log in at /admin/login, open /admin/inventory. Expected: 11 product rows all "לא במעקב", an empty supplies card, six kits showing ∞. Click "התחלת מעקב" on בלוק תכנון קטן, enter 25 → the row shows במלאי 25 / זמין 25 / תקין, and מארז בלוקים + מארז אבן now show a number limited by another (still untracked → ∞ unless all parts tracked; with one tracked part the kit shows 25 limited by it). Try "התאמה" with −30 and reason התאמה + note → status חוסר in red. Then "ספירה" 25 to restore. Leave the row tracked only if Eden's counting starts now; otherwise remove the test level row and `count`/`adjust` movements with psql (test data, minutes old).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/InventoryOverview.tsx src/components/admin/AdminSidebar.tsx src/pages/AdminDashboard.tsx
git commit -m "Admin: /admin/inventory overview — products, packaging supplies, kit build counts

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: `/admin/inventory/movements` ledger

**Files:**
- Create: `src/components/admin/InventoryMovements.tsx`

**Interfaces:**
- Consumes: view `inventory_movement_log`; `MovementLogRow`, `MOVEMENT_REASON_LABELS`, `formatDelta`, `movementsToCsv`, `INVENTORY_QUERY_KEY` (Task 10).

- [ ] **Step 1: Write the component**

```tsx
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowRight, Download, Loader2 } from 'lucide-react';
import { AdminErrorState } from './AdminErrorState';
import {
  INVENTORY_QUERY_KEY, MOVEMENT_REASON_LABELS, formatDelta, movementsToCsv, type MovementLogRow, type MovementReason,
} from './adminInventory';

const PAGE = 500;

/** The ledger. Answers "why is the stock 3?" — every change with its reason, order and author. */
export const InventoryMovements = () => {
  const [reason, setReason] = useState<MovementReason | 'all'>('all');
  const [kind, setKind] = useState<'all' | 'variant' | 'supply'>('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const query = useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'movements', from, to],
    queryFn: async (): Promise<MovementLogRow[]> => {
      let q = supabase.from('inventory_movement_log').select('*').order('created_at', { ascending: false }).limit(PAGE);
      if (from) q = q.gte('created_at', new Date(`${from}T00:00:00`).toISOString());
      if (to) q = q.lte('created_at', new Date(`${to}T23:59:59`).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MovementLogRow[];
    },
  });

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (query.data ?? []).filter((r) => {
      if (reason !== 'all' && r.reason !== reason) return false;
      if (kind !== 'all' && r.item_kind !== kind) return false;
      if (needle && !`${r.item_title} ${r.sku ?? ''} ${r.reference ?? ''} ${r.note ?? ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [query.data, reason, kind, search]);

  const exportCsv = () => {
    const blob = new Blob(['﻿' + movementsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-movements-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/admin/inventory" aria-label="חזרה למלאי"><ArrowRight className="w-5 h-5" /></Link></Button>
          <h1 className="text-2xl font-bold">יומן תנועות מלאי</h1>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="w-4 h-4 ml-2" />ייצוא CSV ({rows.length})
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input placeholder="חיפוש: פריט, מק״ט, אסמכתא, הערה" value={search} onChange={(e) => setSearch(e.target.value)} className="lg:col-span-2" />
          <Select value={reason} onValueChange={(v) => setReason(v as MovementReason | 'all')}>
            <SelectTrigger><SelectValue placeholder="סיבה" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסיבות</SelectItem>
              {(Object.keys(MOVEMENT_REASON_LABELS) as MovementReason[]).map((r) => (
                <SelectItem key={r} value={r}>{MOVEMENT_REASON_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={kind} onValueChange={(v) => setKind(v as 'all' | 'variant' | 'supply')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">מוצרים וחומרי אריזה</SelectItem>
              <SelectItem value="variant">מוצרים בלבד</SelectItem>
              <SelectItem value="supply">חומרי אריזה בלבד</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="מתאריך" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="עד תאריך" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          {query.isLoading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : query.isError ? (
            <AdminErrorState error={query.error} onRetry={() => query.refetch()} title="לא הצלחנו לטעון את יומן התנועות" />
          ) : rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">אין תנועות</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">תאריך</TableHead>
                  <TableHead className="text-right">פריט</TableHead>
                  <TableHead className="text-right">מק"ט</TableHead>
                  <TableHead className="text-right">שינוי</TableHead>
                  <TableHead className="text-right">מלאי אחרי</TableHead>
                  <TableHead className="text-right">סיבה</TableHead>
                  <TableHead className="text-right">הזמנה</TableHead>
                  <TableHead className="text-right">אסמכתא / הערה</TableHead>
                  <TableHead className="text-right">בוצע ע"י</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(r.created_at), 'dd/MM/yy HH:mm', { locale: he })}</TableCell>
                    <TableCell className="font-medium">{r.item_title}{r.item_kind === 'supply' && <span className="text-xs text-muted-foreground mr-2">· אריזה</span>}</TableCell>
                    <TableCell className="font-mono text-xs" dir="ltr">{r.sku ?? '—'}</TableCell>
                    <TableCell className={`font-mono tabular-nums ${r.delta < 0 ? 'text-destructive' : 'text-green-700'}`} dir="ltr">{formatDelta(r.delta)}</TableCell>
                    <TableCell className="font-mono tabular-nums" dir="ltr">{r.on_hand_after}</TableCell>
                    <TableCell>{MOVEMENT_REASON_LABELS[r.reason] ?? r.reason}</TableCell>
                    <TableCell>
                      {r.order_id ? <Link to={`/admin/orders/${r.order_id}`} className="hover:underline font-mono text-xs">#{r.order_number ?? r.order_id.slice(0, 8)}</Link> : '—'}
                    </TableCell>
                    <TableCell className="text-sm max-w-[280px]">
                      {r.reference && <div>{r.reference}</div>}
                      {r.note && <div className="text-muted-foreground">{r.note}</div>}
                      {!r.reference && !r.note && '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground break-all">{r.actor_email ?? 'מערכת'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
```

- [ ] **Step 2: Type-check, lint, manual check**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep InventoryMovements; npx eslint src/components/admin/InventoryMovements.tsx`
Expected: no output, eslint clean.

Manual: after the Task 11 test movements, /admin/inventory/movements lists them newest first with the admin's email under "בוצע ע"י"; the reason filter narrows; the CSV downloads and opens in Numbers/Excel with Hebrew intact (the BOM handles Excel).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/InventoryMovements.tsx
git commit -m "Admin: inventory movements ledger with filters and CSV export

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Product form — stock per variant

**Files:**
- Modify: `src/components/admin/ProductForm.tsx` — schema (~line 30), `VariantRow` (~line 53), defaults (~line 180), product load (~line 200-215, 250, 278-290), save payload (~line 349) and variant save loop (~line 424-447), the מלאי input (~lines 689-692), the variant editor JSX (~lines 700-750)

**Interfaces:**
- Consumes: `variant_stock` view, `inventory_levels` (admin UPDATE policy), `InventoryAdjustDialog`, `stockStatusBadge`, `INVENTORY_QUERY_KEY`, `VariantStockRow` (Task 10).
- Produces: per-variant stock display + "עדכון מלאי" / "התחלת מעקב" button; threshold and policy saved with the form.

- [ ] **Step 1: Remove the product-level מלאי field**

Delete these four pieces: `inventory_quantity: z.string().optional().nullable(),` from `productSchema`; `inventory_quantity: null,` from the default values; `inventory_quantity: ep.inventory_quantity != null ? String(ep.inventory_quantity) : null,` from the load mapping; `inventory_quantity: numOrNull(values.inventory_quantity),` from `newPayload`. Replace the JSX block

```tsx
              <div className="space-y-2">
                <Label htmlFor="inventory_quantity">מלאי (כמות במלאי)</Label>
                <Input id="inventory_quantity" type="number" step="1" {...form.register('inventory_quantity')} placeholder="ריק = לא נמדד" />
              </div>
```
with
```tsx
              <div className="space-y-2 col-span-2">
                <p className="text-xs text-muted-foreground">
                  המלאי מנוהל לכל וריאנט בכרטיס "וריאנטים" למטה ובמסך <a href="/admin/inventory" className="underline">מלאי</a>.
                </p>
              </div>
```

- [ ] **Step 2: Extend `VariantRow` and load stock**

Add to the imports:

```ts
import { InventoryAdjustDialog, type AdjustTarget } from './InventoryAdjustDialog';
import { INVENTORY_QUERY_KEY, stockStatusBadge, variantDisplayTitle, type VariantStockRow } from './adminInventory';
```

Extend `VariantRow`:

```ts
interface VariantRow {
  id: string; // real uuid, or `new-<n>` for unsaved rows
  title: string;
  price: string;
  compare_at_price: string;
  sku: string;
  available_for_sale: boolean;
  /** Inventory (spec §7.6). Empty threshold = store default. Only saved for tracked variants. */
  low_stock_threshold: string;
  policy: 'deny' | 'continue';
}
```

Give the `addVariant` template `low_stock_threshold: '', policy: 'deny'`, and the load mapping (`.map((v: any) => ({ id: v.id, … }))`) the same two fields, filled from the stock query below when present.

Add a stock query next to the product query (edit mode only):

```ts
  const { data: stockRows } = useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'product', id],
    enabled: isEdit,
    queryFn: async (): Promise<VariantStockRow[]> => {
      const { data, error } = await supabase.from('variant_stock').select('*').eq('product_id', id!);
      if (error) {
        if (error.code === '42P01') return []; // inventory migration not applied yet
        throw error;
      }
      return (data ?? []) as VariantStockRow[];
    },
  });
  const stockByVariant = new Map((stockRows ?? []).map((r) => [r.variant_id, r]));
  const [stockDialog, setStockDialog] = useState<AdjustTarget | null>(null);
```

In the effect that maps `existingProduct.product_variants` into `variants`, set `low_stock_threshold: stockByVariant.get(v.id)?.own_threshold != null ? String(stockByVariant.get(v.id)!.own_threshold) : ''` and `policy: stockByVariant.get(v.id)?.policy ?? 'deny'`, and add `stockRows` to that effect's dependency array.

- [ ] **Step 3: Save threshold/policy for tracked variants**

Inside the variant save loop, after the `update(row).eq('id', v.id)` branch (existing variants only), add:

```ts
          // Threshold/policy live on inventory_levels and exist only once the variant is tracked.
          if (stockByVariant.get(v.id)?.is_tracked) {
            const { error: levelError } = await supabase
              .from('inventory_levels')
              .update({
                low_stock_threshold: v.low_stock_threshold.trim() === '' ? null : Number(v.low_stock_threshold),
                policy: v.policy,
              })
              .eq('variant_id', v.id);
            if (levelError) throw levelError;
          }
```
and in the mutation's `onSuccess`, also `queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });`.

- [ ] **Step 4: Variant editor UI**

Inside each variant card, after the `grid grid-cols-2 gap-3` block, add:

```tsx
                {!v.id.startsWith('new-') && (() => {
                  const stock = stockByVariant.get(v.id);
                  const badge = stockStatusBadge(stock?.status ?? 'untracked');
                  return (
                    <div className="border-t border-border pt-3 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">מלאי</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>{badge.label}</span>
                          {stock?.is_tracked && (
                            <span className="text-muted-foreground font-mono tabular-nums" dir="ltr">
                              {stock.on_hand} במלאי · {stock.reserved} שמור · {stock.available} זמין
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={stock?.is_tracked ? 'outline' : 'default'}
                          onClick={() => setStockDialog({
                            kind: 'variant',
                            id: v.id,
                            title: stock ? variantDisplayTitle(stock) : (v.title || form.getValues('title')),
                            onHand: stock?.on_hand ?? null,
                          })}
                        >
                          {stock?.is_tracked ? 'עדכון מלאי (ספירה)' : 'התחלת מעקב'}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">סף התראה (ריק = ברירת המחדל)</Label>
                          <Input type="number" step="1" min="0" dir="ltr" value={v.low_stock_threshold}
                            disabled={!stock?.is_tracked}
                            onChange={(e) => updateVariant(v.id, { low_stock_threshold: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">כשהמלאי נגמר</Label>
                          <Select value={v.policy} onValueChange={(val) => updateVariant(v.id, { policy: val as 'deny' | 'continue' })} disabled={!stock?.is_tracked}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="deny">עצור מכירה ב־0</SelectItem>
                              <SelectItem value="continue">אפשר הזמנה מראש</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {!stock?.is_tracked && (
                        <p className="text-xs text-muted-foreground">סף ומדיניות נפתחים לעריכה אחרי הספירה הראשונה.</p>
                      )}
                    </div>
                  );
                })()}
```

Render the dialog once, before the form's closing tag:

```tsx
      <InventoryAdjustDialog
        open={stockDialog !== null}
        onOpenChange={(open) => { if (!open) setStockDialog(null); }}
        target={stockDialog}
        mode="count"
        onDone={() => queryClient.invalidateQueries({ queryKey: [...INVENTORY_QUERY_KEY, 'product', id] })}
      />
```

- [ ] **Step 5: Type-check, lint, manual check**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep ProductForm; npx eslint src/components/admin/ProductForm.tsx`
Expected: no output, eslint clean.

Manual: open an existing product in /admin/products/:id. The מכירות card no longer has a מלאי input; the variant card shows "לא במעקב" + "התחלת מעקב". Click it, count 12 → row shows 12 במלאי, threshold and policy become editable; set threshold 3, save the form → `SELECT low_stock_threshold FROM inventory_levels WHERE variant_id=…` is 3. Create a new product with a new variant → no stock block (unsaved variant), save, reopen → stock block appears. Clean up test rows if this was not a real count.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/ProductForm.tsx
git commit -m "Admin product form: per-variant stock, threshold and policy; product-level מלאי removed

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: Docs, memory, end-to-end verification

**Files:**
- Modify: `CLAUDE.md` (new "Inventory" section after "Coupons"; `ORDER_ALERT_EMAILS` in the server env list; `npm test` in Local development)
- Modify: `/Users/oronsmac/.claude/projects/-Users-oronsmac-MothersDay-main/memory/project-inventory-design.md` (status → phase 1 implemented)

- [ ] **Step 1: CLAUDE.md**

Add to the commands list: `` `npm test` — Vitest (pure helpers in `api/_lib`, `src/lib`, `src/components/admin`) ``. Add `ORDER_ALERT_EMAILS` to the Server env list with the note "comma-separated owners' addresses for the new-order and low-stock emails". Insert after the Coupons paragraph:

```markdown
**Inventory (added 2026-09-06, spec `docs/superpowers/specs/2026-09-05-inventory-management-design.md`):**
stock is tracked per variant in `inventory_levels` (no row = untracked = unlimited) with an append-only
`inventory_movements` ledger; `inv_apply()` is the only writer (the `guard_on_hand` trigger blocks any
other `on_hand` change). Order-side changes come from two triggers on `orders`: `orders_inventory`
(→ `paid` writes `sale` movements with kits exploded to parts via `order_stock_lines()`;
`paid` → `cancelled`/`refunded` while unfulfilled negates them as `return`) and `orders_supplies`
(→ `shipped` consumes active `packaging_supplies`). `mark_order_paid()` no longer touches stock.
Reservations are derived from pending, unexpired orders (`inventory_reserved`), never stored.
Public: `storefront_availability(variant_id, sellable, max_orderable)` — the only stock signal the
storefront/SEO see (`src/lib/availability.ts`). Staff: `variant_stock`, `supply_stock`, `kit_stock`,
`inventory_movement_log` (rows filtered by `is_staff_or_service()`). `/api/create-order` refuses
shortages with 409 `insufficient_stock` (`check_order_stock()`). Every paid order emails the owners
(`ORDER_ALERT_EMAILS`) via `notifyOwnersOfPaidOrder()`, folding in items that just dipped under
their threshold (`low_stock_alerted_at` stamps, cleared on restock). Admin: `/admin/inventory`
(overview, per-row קליטה/ספירה/התאמה through the `record_inventory_movements` RPC) and
`/admin/inventory/movements`; per-variant threshold/policy in the product form. Kits are never
stocked. SQL scenarios: `supabase/tests/inventory_scenarios.sql` (rolled back; run with psql).
```

- [ ] **Step 2: Memory note**

Update `project-inventory-design.md`: status line → "Phase 1 (core) implemented on `launch/payplus` <date>; phase 2 plan at `docs/superpowers/plans/2026-09-05-inventory-workflow.md`", keep the design summary, and add a "How to apply" line: "stock changes only via `inv_apply()`; test SQL with the rolled-back scenario script; never delete real ledger rows."

- [ ] **Step 3: Full verification**

```bash
npm test
npx eslint api/_lib/inventory.ts api/_lib/newOrderAdminEmail.ts api/_lib/orderPayment.ts api/create-order.ts api/payplus-callback.ts api/payplus-return.ts api/simulate-payment.ts src/lib/availability.ts src/lib/api.ts src/hooks/useAddToCart.ts src/hooks/useCartStockClamp.ts src/pages/ProductDetail.tsx src/pages/Checkout.tsx src/components/QuickViewModal.tsx src/components/CartDrawer.tsx src/components/checkout/CheckoutSummary.tsx src/components/admin/adminInventory.ts src/components/admin/InventoryAdjustDialog.tsx src/components/admin/InventoryOverview.tsx src/components/admin/InventoryMovements.tsx src/components/admin/ProductForm.tsx src/components/admin/AdminSidebar.tsx src/pages/AdminDashboard.tsx scripts/prerender-seo.ts
npm run build
PGPASSWORD=$(security find-generic-password -s mothersday-supabase-db -w) $PSQL -f supabase/tests/inventory_scenarios.sql
```
Expected: all tests pass; eslint clean; build succeeds with prerender; both scenario NOTICE lines and `ROLLBACK`.

End-to-end on the preview (payment simulator on): track one part at 3 (admin "התחלת מעקב"), order a kit containing it → the product page stepper for the part caps at 3; the kit's max is floor(3/qty); after simulated payment: ledger shows `sale` rows for the parts, `/admin/inventory` shows the new numbers, both owners receive "[בדיקה] הזמנה חדשה" and, if the part fell to ≤ 5, the מלאי נמוך section. Cancel the order from the admin (status → בוטל) → `return` rows appear and the numbers recover. Then reset the part with a ספירה to its real count or remove the test level row.

- [ ] **Step 4: Commit and hand off**

```bash
git add CLAUDE.md
git commit -m "Docs: inventory section in CLAUDE.md

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin launch/payplus
```
Phase 1 is complete when the preview run above passes. Merging to `main` (production) is Oron's call; nothing changes for customers until Eden's first count creates level rows. Continue with `docs/superpowers/plans/2026-09-05-inventory-workflow.md`.

---

## Self-review notes

- Spec coverage: §4.1 → Task 1; §4.1a → Task 1; §4.3/4.4/4.5 → Task 2; §4.2/§8 views → Task 3; §5 create-order → Task 5; §5 owners' email + low-stock folding → Task 6; §6 storefront → Tasks 7–9; §7.1 → Task 11; §7.4 movements → Task 12; §7.6 → Task 13; §10 fail-open → Tasks 4, 7, 9, 11. Phase 2 (receive/count/supplies screens, pick list, restock dialog, dashboard card, settings, לאריזה filter, HFD auto-shipped + supplies email, decline expiry) lives in the workflow plan.
- Names used across tasks: `inv_apply`, `explode_stock_lines`, `order_stock_lines`, `order_total_units`, `record_inventory_movements`, `check_order_stock`, `storefront_availability`, `variant_stock`, `supply_stock`, `kit_stock`, `inventory_movement_log`, `INVENTORY_QUERY_KEY`, `AVAILABILITY_QUERY_KEY`, `recordMovements`, `InventoryAdjustDialog { open, onOpenChange, target, mode, onDone }`, `notifyOwnersOfPaidOrder(supabase, orderId, siteUrl, { simulated })`.
