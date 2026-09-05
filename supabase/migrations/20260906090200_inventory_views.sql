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
-- explode the row's own line_items: a function called from a view runs as the
-- caller, and order_stock_lines() would hit RLS on orders for anon.
CREATE OR REPLACE VIEW public.inventory_reserved AS
SELECT l.variant_id, SUM(l.qty)::int AS reserved
FROM orders o
CROSS JOIN LATERAL explode_stock_lines(o.line_items) l
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
-- A view's "run as owner" privilege bypass covers table/view reads, not function
-- calls: a function called from a view runs as the caller. inventory_reserved
-- (queried by the public availability views below) explodes each order row's own
-- line_items via explode_stock_lines(), which only touches public-read catalog
-- tables, so anon/authenticated need EXECUTE on it too, or every anon SELECT on
-- storefront_availability errors with "permission denied for function
-- explode_stock_lines". order_stock_lines() stays authenticated-only (not anon):
-- it takes an order id and re-reads orders internally, which for a non-admin,
-- non-owner caller is correctly filtered to nothing by RLS rather than erroring.
GRANT EXECUTE ON FUNCTION public.explode_stock_lines(JSONB) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.order_stock_lines(UUID) FROM anon;         -- explicit: undo an earlier over-broad grant
GRANT EXECUTE ON FUNCTION public.order_stock_lines(UUID) TO authenticated;
GRANT SELECT ON public.storefront_availability, public.variant_availability, public.kit_availability TO anon, authenticated;
REVOKE ALL ON public.variant_stock, public.supply_stock, public.kit_stock, public.inventory_movement_log FROM PUBLIC, anon;
GRANT SELECT ON public.variant_stock, public.supply_stock, public.kit_stock, public.inventory_movement_log TO authenticated;
REVOKE ALL ON FUNCTION public.check_order_stock(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_staff_or_service() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_or_service() TO anon, authenticated;
