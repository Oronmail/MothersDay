# Inventory Management — Design Spec

**Date:** 2026-09-05
**Approach:** Ledger-based inventory in Supabase (Option B)
**Status:** Approved by Oron on 2026-09-05 — decisions settled in section 12; implementation plans in
`docs/superpowers/plans/2026-09-05-inventory-core.md` and `2026-09-05-inventory-workflow.md`

---

## 1. Goal

Keep an accurate count of every physical item on the office shelves, and keep it accurate
automatically as orders are paid, cancelled and refunded. Derive kit (מארז) availability from the
components it is packed from. Stop selling what is not there. Give the admin one stock screen,
a receiving and counting workflow, a pick list per order, and a low-stock alert.

One location only: everything is stored, packed and shipped from the store office.

## 2. Where we are today

### Catalog (production, 2026-09-05)

| Fact | Value |
|------|-------|
| Physical products | 10 (9 active, 1 draft: the family board, which has 2 variants — with frame / refill) |
| Kits (`is_bundle`) | 6, built from 16 component lines; every component is a single-variant product; two lines use quantity 2 |
| Collections | 5 — marketing groupings only, no stock meaning |
| SKUs (`sku`) | none set, on products or variants |
| `products.inventory_quantity` | NULL on every product — nothing is tracked today |

Kit contents (from `bundle_items`):

- מארז בלוקים: בלוק קטן + בינוני + גדול
- מארז פודרה: לוח שבועי + מחברת שורות בינונית + בלוק בינוני
- מארז יין: תכנון ארוחות + בלוק גדול
- מארז תכנון: לוח שבועי + תכנון ארוחות + רשימת קניות
- מארז מחברות: 2× מחברת בינונית + 2× מחברת קטנה
- מארז אבן: רשימת קניות + מחברת קטנה + בלוק קטן

### Order flow, and where stock is touched

1. **Cart → `/api/create-order`.** Validates each variant exists and `available_for_sale` is true.
   No stock check. Writes a `pending` order with `expires_at = now + 2h`. Line items carry
   `product_id`, `variant_id`, `quantity`; a kit is one line item with the kit's own ids.
2. **`/api/create-payment` → PayPlus hosted page → `/api/payplus-callback`.** The callback calls
   `mark_order_paid()`, which decrements `products.inventory_quantity` per **product** when the
   column is not NULL. A kit decrements the kit row, never its components.
3. **Declined** charge: order stays `pending` until it expires. **Refund / same-day void**:
   `financial_status = 'refunded'`. Neither path touches stock.
4. **Admin order card.** The two status selects update `orders` directly. A manual change to
   `paid`, `cancelled` or `refunded` has no stock effect.
5. **HFD shipment** (`/api/hfd-shipment`) stores the shipment number and tracking number. It does
   not set `fulfillment_status = 'shipped'`; the admin still changes the select by hand.
6. **Storefront availability** is the manual `product_variants.available_for_sale` switch, used by
   the product page, quick view, the order API and the SEO prerender (InStock / OutOfStock).

### Gaps

- **Wrong grain.** Stock lives on the product; the board sells as two physically different items.
- **Kits do not consume components.** Selling a מארז מחברות should take 2 medium and 2 small
  notebooks off the shelf.
- **No history.** A number with no ledger cannot be explained or trusted after the first mistake.
- **No restock** on cancel or refund; **no oversell guard** at order time.
- **Availability is disconnected** from stock; someone must flip a switch when a shelf empties.
- **No low-stock signal.** Nobody is told before the last unit sells.
- **No workflow.** The only way to change stock is to overwrite a number in the product form.
- **Packing is manual.** The order card lists the kit, not the pieces to pull.

## 3. Options

### A. Patch the current column

Keep `products.inventory_quantity`. Explode kits and restock on refund inside `mark_order_paid()`
and a new trigger. Show the number in the product list.

- Effort: 1–2 days.
- Keeps the wrong grain, no history, no receiving or counting screens. The number stays a guess.

### B. Ledger-based inventory in Supabase — recommended

Stock at variant grain in a dedicated `inventory_levels` table, every change recorded in an
append-only `inventory_movements` ledger, all order-driven changes made by one database trigger,
kit availability derived from components, and an admin area at `/admin/inventory`.

- Effort: about two weeks across two phases (section 9).
- Correct grain, explainable numbers, one code path for every order transition, no new
  Vercel functions except an optional cron. Fits a single-location store with a small catalog.

### C. External inventory service

Zoho Inventory, Cin7 or an Israeli ERP, synced by webhooks.

- Monthly cost, a second source of truth, Hebrew and PayPlus integration friction, and far more
  than 10 products need. Revisit only if a second sales channel or wholesale appears.

## 4. Data model (Option B)

### 4.1 Tables

```sql
-- One row per tracked variant. No row = untracked = unlimited.
CREATE TABLE inventory_levels (
  variant_id           UUID PRIMARY KEY REFERENCES product_variants(id) ON DELETE CASCADE,
  on_hand              INTEGER NOT NULL DEFAULT 0,          -- may go negative after a sale
  low_stock_threshold  INTEGER,                             -- NULL = store default
  policy               TEXT NOT NULL DEFAULT 'deny'
                       CHECK (policy IN ('deny', 'continue')), -- continue = allow pre-order
  low_stock_alerted_at TIMESTAMPTZ,                         -- cleared when stock rises above threshold
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Packaging supplies (decision 8): boxes, tissue, cards. Not sold, so they carry their
-- own on_hand here instead of a catalog variant. Consumed when an order ships.
CREATE TABLE packaging_supplies (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  sku                  TEXT UNIQUE,
  on_hand              INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold  INTEGER,                             -- NULL = store default
  consumption_mode     TEXT NOT NULL DEFAULT 'per_order'
                       CHECK (consumption_mode IN ('per_order', 'per_item', 'manual')),
  quantity_per_use     INTEGER NOT NULL DEFAULT 1 CHECK (quantity_per_use > 0),
  is_active            BOOLEAN NOT NULL DEFAULT true,
  low_stock_alerted_at TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only. Never updated or deleted; a mistake is reversed by a counter-movement.
-- Each row is about exactly one thing: a catalog variant OR a packaging supply.
CREATE TABLE inventory_movements (
  id            BIGSERIAL PRIMARY KEY,
  variant_id    UUID REFERENCES product_variants(id),
  supply_id     UUID REFERENCES packaging_supplies(id),
  delta         INTEGER NOT NULL CHECK (delta <> 0),
  on_hand_after INTEGER NOT NULL,
  reason        TEXT NOT NULL CHECK (reason IN
                  ('sale', 'return', 'consume', 'receive', 'count', 'adjust', 'damage', 'gift')),
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  reference     TEXT,          -- supplier invoice / batch / count session
  note          TEXT,
  created_by    UUID,          -- auth.uid() for admin actions, NULL for the system
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((variant_id IS NULL) <> (supply_id IS NULL))
);

-- One sale set, one return set, one consume set per order and item: replays are no-ops.
CREATE UNIQUE INDEX inventory_movements_order_variant_once
  ON inventory_movements (order_id, variant_id, reason)
  WHERE order_id IS NOT NULL AND variant_id IS NOT NULL AND reason IN ('sale', 'return');
CREATE UNIQUE INDEX inventory_movements_order_supply_once
  ON inventory_movements (order_id, supply_id, reason)
  WHERE order_id IS NOT NULL AND supply_id IS NOT NULL AND reason = 'consume';

ALTER TABLE orders ADD COLUMN admin_notified_at TIMESTAMPTZ;  -- new-order email to the owners sent once

ALTER TABLE bundle_items ADD COLUMN variant_id UUID REFERENCES product_variants(id);
-- NULL = the component product's first variant. Needed only when a multi-variant
-- product (the family board) is placed in a kit.

ALTER TABLE products DROP COLUMN inventory_quantity;  -- NULL everywhere today; nothing to migrate
```

Store settings (new keys in `store_settings`): `low_stock_threshold_default` (5),
`inventory_reserve_pending` (true). Alert recipients live in the server env var
`ORDER_ALERT_EMAILS` (comma-separated: `eden@mothersday.co.il,oron@mothersday.co.il`), not in
`store_settings`, which is public-read.

### 4.1a SKUs (decision 6)

Set once by a data migration on `product_variants.sku`, matched by product handle (and variant
title for the board). The names come from the proposal mock; the task notebook had none there and
gets `NB-TASKS`.

| Product | Variant | SKU |
|---------|---------|-----|
| בלוק תכנון גדול | — | `BLK-L` |
| בלוק תכנון בינוני | — | `BLK-M` |
| בלוק תכנון קטן | — | `BLK-S` |
| מחברת שורות בינונית | — | `NB-M` |
| מחברת שורות קטנה | — | `NB-S` |
| מחברת יום האם לניהול משימות קבועות | — | `NB-TASKS` |
| לוח שבועי | — | `WB` |
| תכנון ארוחות משפחתי שבועי | — | `MEAL` |
| רשימת קניות / סידורים | — | `LIST` |
| לוח משפחתי שבועי | כולל מסגרת עץ מגנטית | `FB-FRAME` |
| לוח משפחתי שבועי | ריפיל — דפים בלבד | `FB-REFILL` |

Kits get no SKU; they are recipes.

### 4.2 Stock arithmetic

| Term | Definition |
|------|------------|
| on_hand | Physical count on the shelf, from `inventory_levels` |
| reserved | Sum of quantities in `pending` orders whose `expires_at > now()`, kits exploded |
| available | on_hand − reserved |
| sellable | `available_for_sale` AND (untracked OR available > 0 OR policy = 'continue') |
| max_orderable | LEAST(GREATEST(available, 0), 20) for tracked variants with policy 'deny'; NULL otherwise |
| kit available | MIN over components of floor(component available ÷ component quantity); an untracked component counts as unlimited |
| status | ok / low (available ≤ threshold) / out (available ≤ 0) / short (on_hand < 0) / untracked |

Reservation is derived, not stored: a pending order reserves stock by existing, and stops
reserving when it is paid, expires or changes status. No cron is needed to release anything.

Views:

- `inventory_reserved` — variant_id, reserved (internal).
- `variant_stock` — everything above, per variant, **admin only**.
- `variant_availability` — variant_id, sellable, max_orderable, **public**.
- `product_availability` — product_id, sellable, max_orderable, **public**; kits computed from
  components.

The public views are ordinary (owner-rights) views that expose only the two columns the
storefront needs, so exact stock numbers never leave the admin.

### 4.3 Writing movements

One internal function does every write:

```
inv_apply(variant_id, delta, reason, order_id, reference, note, actor)
```

- Locks the `inventory_levels` row. For `sale` / `return` on an untracked variant it returns
  without writing. For `receive` / `count` / `adjust` on an untracked variant it creates the row
  (tracking starts).
- Refuses variants whose product is a kit; kits are never stocked.
- Targets exactly one of a variant or a packaging supply. Supplies have no reservations, kits or
  sellable state — only on_hand, a threshold and the ledger.
- Updates `on_hand`, inserts the movement with `on_hand_after`, clears `low_stock_alerted_at`
  when the new on_hand is above the threshold.

Two callers:

- `record_inventory_movements(jsonb)` — SECURITY DEFINER RPC for the admin screens; checks
  `is_admin()`; one transaction per batch. For a **count**, the RPC receives counted quantities
  and computes each delta inside the lock, so a sale that lands during the count is not
  overwritten.
- The order trigger below.

### 4.4 The order trigger — one code path for every transition

```sql
CREATE TRIGGER orders_inventory
  AFTER UPDATE OF financial_status ON orders
  FOR EACH ROW WHEN (OLD.financial_status IS DISTINCT FROM NEW.financial_status)
  EXECUTE FUNCTION apply_order_inventory();
```

| Transition | Action |
|------------|--------|
| → `paid` (from any status) | `sale` movements, −qty per exploded stock line. Negative on_hand is allowed: the customer has already paid; the shortage shows in red in the admin. |
| `paid` → `cancelled` / `refunded`, `fulfillment_status = 'unfulfilled'` | `return` movements that **negate this order's own sale movements**. Goods never left. |
| `paid` → `cancelled` / `refunded`, already shipped or delivered | Nothing automatic. The order card shows "החזרה למלאי" for when the parcel comes back. |
| `pending` → `failed` / expired | Nothing. The reservation disappears because the order is no longer pending. |

Returning by negating the recorded sale (not by re-exploding the kit) keeps the ledger right even
if the kit definition changed after the sale.

`order_stock_lines(order_id)` does the explosion: a plain line is its `variant_id × quantity`; a
kit line becomes each component's variant (`bundle_items.variant_id`, else the product's first
variant) × component quantity × line quantity.

The trigger replaces the inventory `UPDATE` inside `mark_order_paid()`, which then only does
payment work. Because the trigger fires on the row, the PayPlus callback, the dev simulator, and a
manual status change in the admin all keep stock right.

Edge not covered by the trigger: re-paying an order that was already cancelled and returned. The
unique index blocks a second `sale` set; the admin corrects with an `adjust` movement. This is
rare and documented on the order card.

### 4.5 Packaging supplies are consumed when the order ships

A second trigger, `AFTER UPDATE OF fulfillment_status ON orders`, fires on the transition into
`shipped` (from the HFD create call or the admin select) and writes one `consume` movement per
active supply:

| consumption_mode | delta |
|------------------|-------|
| `per_order` | −quantity_per_use |
| `per_item` | −quantity_per_use × total units in the order (kits counted as their parts) |
| `manual` | nothing; counted and adjusted by hand only |

Supplies going negative is allowed and shown as חוסר, like products. A cancelled shipment does not
un-consume: the box was used. Supplies are never reserved and never affect what the storefront
sells.

## 5. API changes

- **`/api/create-order`** — after the variant check, call `check_order_stock(items)` (service
  role). Any shortage returns HTTP 409 `insufficient_stock` with
  `[{ variant_id, title, available }]`. `Checkout.tsx` already maps `out_of_stock`-style codes
  to a Hebrew message; extend it to name the item and the quantity left.
- **`/api/payplus-callback`** decline path — set `expires_at = now() + 15 min` so a declined
  order releases its reservation sooner than the 2-hour window. Optional, one line.
- **`api/_lib/orderPayment.ts`** — after a first `paid` transition, send the **new-order email
  to the owners** (decision 7): every paid order produces one Hebrew email to the addresses in
  `ORDER_ALERT_EMAILS` with order number, customer, items (kits shown with their parts),
  total, payment method and a link to the admin order card. Sent once, stamped in
  `orders.admin_notified_at`. If this order took any item to or under its threshold and
  `low_stock_alerted_at` is empty, the same email carries a **מלאי נמוך** section (item, quantity
  left, kits it blocks) and the stamp is set — one email, not two. The ledger clears the stamp on
  the next restock above threshold, so the warning repeats only after a new dip. Best-effort,
  never fails the payment path (same pattern as the confirmation email).
- **`/api/hfd-shipment`** create — after marking the order shipped, the supplies consumed by the
  trigger are checked the same way; a supply that dipped sends a standalone low-stock email to the
  same addresses. Dips caused by admin-initiated movements (count, adjust, damage) show on the
  dashboard card only; the admin was looking at the screen.
- **`/api/hfd-shipment`** create — also set `fulfillment_status = 'shipped'`. Not inventory,
  but it is what lets the packing queue empty itself.
- No new Vercel functions. Admin writes go through the RPC with the admin's JWT.

## 6. Storefront changes

- Product queries fetch `product_availability` / `variant_availability` for the ids on the page
  in a second query, the way bundle contents already are, and set `availableForSale` from
  `sellable`. `available_for_sale` stays as the manual hide switch.
- Product page and quick view: the add-to-cart button reads "אזל מהמלאי" when not sellable; the
  quantity stepper is capped at `max_orderable`.
- Kit cards and kit pages go sold-out when any component is out.
- Cart drawer and checkout summary re-check `max_orderable` on load and clamp quantities, so the
  customer sees the problem before the order API refuses it.
- SEO prerender reads the public view for InStock / OutOfStock.
- Scarcity copy ("נשארו רק 2") is **off** unless Eden wants it (decision 5).

## 7. Admin UI

New sidebar entry **מלאי** (Boxes icon) between מארזים and קולקציות, routes under
`/admin/inventory`. Components live in `src/components/admin/` with an `adminInventory.ts`
helper module mirroring `adminOrders.ts`.

### 7.1 `/admin/inventory` — מצב מלאי

Table, one row per tracked variant: thumbnail + product (variant title when not default),
מק"ט, במלאי (on_hand), שמור (reserved), זמין (available), סף, מצב chip
(תקין / נמוך / אזל / חוסר / לא במעקב), תנועה אחרונה. Filters: הכל / נמוך / אזל / לא במעקב.
Row actions: קליטה (+n), ספירה (set), התאמה (±n with reason and note). Untracked variants are
listed greyed with "התחלת מעקב".

Below the table, **מארזים**: per kit, "אפשר להרכיב N" and the limiting component.

### 7.2 `/admin/inventory/receive` — קליטת סחורה

Multi-row form: variant picker, quantity, reference (supplier invoice / batch), note. Submits
one `record_inventory_movements` batch with reason `receive`. The daily case: the printer
delivered 200 notebooks.

### 7.3 `/admin/inventory/count` — ספירת מלאי

Every tracked variant with an input for the counted quantity, pre-filled with on_hand. On
submit the screen shows only the rows that differ, with the delta, and asks to confirm. Writes
`count` movements for those rows, tagged with one reference for the session. Use monthly and
before the Mother's Day peak.

### 7.4 `/admin/inventory/movements` — יומן תנועות

The ledger: date, item, delta, on_hand_after, reason, order link, reference, note, who. Filters
by item, reason and date range; CSV export. This is the screen that answers "why is it 3?".

### 7.5 Order card additions

- **רשימת ליקוט** card: line items with kits exploded into "pull these" rows
  (component × quantity), a checkbox per row for the packer (UI state only), and a red note when a
  row's on_hand is short.
- **החזרה למלאי** button on cancelled or refunded orders that were shipped: a dialog with per-line
  quantity and condition (תקין → `return`, פגום → `damage`).
- Orders list: a **לאריזה** quick filter (paid + unfulfilled), the daily queue.

### 7.6 Product form

The product-level מלאי field is removed. Each variant row gains מלאי, סף התראה and מדיניות
(עצור מכירה ב־0 / אפשר הזמנה מראש). Editing מלאי here writes an `adjust` movement with the note
"מטופס המוצר"; it never overwrites the number silently. Kits show "המלאי מחושב מהרכיבים".

### 7.7 `/admin/inventory/supplies` — חומרי אריזה

List of packaging supplies with on_hand, threshold, mode (לכל הזמנה / לכל פריט / ידני), quantity
per use and active switch; add and edit in a dialog. Row actions reuse קליטה / ספירה / התאמה.
Supplies also appear in the overview under a second heading and in the movements log.

### 7.8 Dashboard and settings

- Dashboard card **מלאי נמוך**: up to five items (products and supplies) with available /
  threshold, and a warning line for kits that cannot be assembled.
- Settings: default threshold and the "pending orders reserve stock" switch (alert recipients are
  the `ORDER_ALERT_EMAILS` server variable).

## 8. Security

- `inventory_levels`, `inventory_movements`: RLS on; SELECT for `is_admin()` only; no INSERT,
  UPDATE or DELETE policies. Writes happen only inside `inv_apply()` (SECURITY DEFINER), reached
  through the admin RPC or the order trigger.
- `record_inventory_movements` and `check_order_stock`: revoked from `anon`; the first checks
  `is_admin()`, the second is called with the service role from the order API.
- Public views expose `sellable` and `max_orderable` only. Stock counts never reach the browser
  of a customer.
- `apply_order_inventory()` runs as the trigger owner; the orders row is already locked by
  `mark_order_paid()`'s `FOR UPDATE`.

## 9. Phases

| Phase | Scope | Rough effort |
|-------|-------|--------------|
| 1 — Core (`plans/2026-09-05-inventory-core.md`) | Migrations (tables incl. supplies, SKUs, `inv_apply`, `order_stock_lines`, both order triggers, RPCs, views, settings keys), strip inventory from `mark_order_paid()`, `check_order_stock` in create-order, new-order email to the owners with the folded low-stock section, storefront `sellable` + kit availability + stepper cap, SEO prerender, variant stock fields in the product form, `/admin/inventory` overview with adjust dialog, movements log, sidebar + routes. First stock count by Eden seeds the levels. | 5–6 days |
| 2 — Workflow (`plans/2026-09-05-inventory-workflow.md`) | Receive and count screens, packaging supplies screen, pick list on the order card, manual return dialog, dashboard card, settings fields, לאריזה filter, auto-`shipped` on HFD create + supplies low-stock email, decline releases reservation early. | 3–4 days |
| 3 — Optional | Aggregated daily pick list (print view), SKUs in the HFD `orderItems` payload, weekly stock digest cron, scarcity copy on the product page. | as needed |

Phase 1 ships behind no flag: with no `inventory_levels` rows every variant is untracked and the
store behaves exactly as today. Tracking starts item by item as Eden counts.

## 10. Error handling and edge cases

- Untracked variant: ignored by every stock check and movement; unlimited.
- Sale drives on_hand negative: allowed, shown as חוסר in red, alert sent.
- Customer pays after the 2-hour expiry (link still valid): the order is marked paid and the
  sale is recorded; a shortage is visible rather than hidden.
- Order line points at a deleted variant: `order_stock_lines` skips it and the trigger logs a
  warning; the admin sees the order without a pick row for it.
- Kit definition changes after a sale: returns negate the recorded sale, not the new definition.
- Concurrent count and sale: the count delta is computed under the row lock.
- Missing migration: the storefront's second availability query fails open (everything sellable)
  and the admin screen shows a setup note, the same pattern as reviews and carts.

## 11. Testing

- SQL scenario script (`supabase/tests/inventory.sql`, run with psql against a local or preview
  database): paid twice → one sale set; kit with quantity 2 explodes correctly; cancel unfulfilled
  → one return set, idempotent; cancel shipped → no movement; count under concurrent sale;
  untracked variant untouched; kit availability with one untracked component.
- Order API: insufficient stock returns 409 with the item and quantity; sufficient stock passes.
- Preview deployment with the payment simulator: place an order for a kit, watch the ledger,
  cancel from the admin, watch the return.
- Manual: receive, count, adjust from the admin; product page flips to אזל מהמלאי at zero;
  low-stock email arrives once and again only after a restock.

## 12. Decisions (settled by Oron, 2026-09-05)

1. **Kits are assembled at packing time** from component stock; no pre-assembled kit stock. ✅
2. **Pending orders reserve stock** for the payment window; a setting turns it off. ✅
3. **Cancel or refund before shipping restocks automatically**; after shipping it is a manual
   button on the order card. ✅
4. **Exact stock is never public**; the storefront gets only sold-out and a max quantity. ✅
5. **Scarcity copy** on the product page: off. ✅
6. **SKUs**: the names from the proposal mock (section 4.1a); `NB-TASKS` added for the task
   notebook. ✅
7. **Alerts**: default threshold 5; low-stock and **new-order emails go to
   `eden@mothersday.co.il` and `oron@mothersday.co.il`** on every purchase (section 5). ✅
8. **Packaging supplies are tracked items**, consumed when an order ships (sections 4.1, 4.5, 7.7). ✅

## 13. Out of scope

Multiple locations, purchase orders and supplier management, serial or lot tracking, barcode
scanning, cost accounting and stock valuation, un-consuming supplies when a shipment is cancelled,
and the HFD delivered-status poll (tracked separately).
