-- Inventory ledger scenarios. Everything runs inside one transaction and is
-- rolled back, so it is safe against the linked database.
-- Run: PGPASSWORD=... psql "<conn>" -v ON_ERROR_STOP=1 -f supabase/tests/inventory_scenarios.sql
BEGIN;

DO $$
DECLARE
  p_a UUID; p_b UUID; p_c UUID; p_k UUID;
  v_a UUID; v_b UUID; v_c UUID; v_k UUID;
  s_box UUID; s_card UUID; s_manual UUID;
  o1 UUID; o2 UUID; o3 UUID; o4 UUID;
  n INTEGER;
  v_a_before INTEGER; v_b_before INTEGER;
  v_admin UUID; v_mov_id BIGINT;
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

  -- ---- order 4: kit × quantity 2 → sale A −4, B −2 (recipe scales with the line qty) ----
  INSERT INTO orders (line_items, shipping_address, total_price, currency_code, financial_status, fulfillment_status, expires_at, customer_email)
  VALUES (jsonb_build_array(jsonb_build_object('product_id', p_k, 'variant_id', v_k, 'quantity', 2, 'title', 'מארז בדיקה', 'price', '30')),
          '{}'::jsonb, 60, 'ILS', 'pending', 'unfulfilled', now() + interval '2 hours', 'test@example.com')
  RETURNING id INTO o4;

  ASSERT (SELECT qty FROM order_stock_lines(o4) WHERE variant_id = v_a) = 4, 'explode A qty2';
  ASSERT (SELECT qty FROM order_stock_lines(o4) WHERE variant_id = v_b) = 2, 'explode B qty2';
  ASSERT order_total_units(o4) = 6, 'total units qty2';

  SELECT on_hand INTO v_a_before FROM inventory_levels WHERE variant_id = v_a;
  SELECT on_hand INTO v_b_before FROM inventory_levels WHERE variant_id = v_b;
  UPDATE orders SET financial_status = 'paid' WHERE id = o4;
  ASSERT (SELECT on_hand FROM inventory_levels WHERE variant_id = v_a) = v_a_before - 4, 'sale A o4';
  ASSERT (SELECT on_hand FROM inventory_levels WHERE variant_id = v_b) = v_b_before - 2, 'sale B o4';

  -- ---- alert stamp clears when stock rises above threshold ----
  -- on_hand is 4 here (8 after o2, minus 4 from o4's kit×2 sale) — still ≤ the 9 threshold below.
  UPDATE inventory_levels SET low_stock_alerted_at = now(), low_stock_threshold = 9 WHERE variant_id = v_a;
  PERFORM inv_apply(v_a, NULL, 100, NULL, 'receive', NULL, 'חשבונית 1', NULL, NULL);
  ASSERT (SELECT low_stock_alerted_at FROM inventory_levels WHERE variant_id = v_a) IS NULL, 'alert stamp not cleared';

  -- ---- damage is idempotent per order+variant (manual-return dialog retry) ----
  PERFORM inv_apply(v_a, NULL, -1, NULL, 'damage', o2, NULL, 'test', NULL);
  SELECT on_hand INTO v_a_before FROM inventory_levels WHERE variant_id = v_a;
  SELECT inv_apply(v_a, NULL, -1, NULL, 'damage', o2, NULL, 'test', NULL) INTO v_mov_id;
  ASSERT (SELECT on_hand FROM inventory_levels WHERE variant_id = v_a) = v_a_before, 'damage replay decremented twice';
  ASSERT v_mov_id IS NULL, 'damage replay decremented twice';

  -- ---- direct on_hand edits are blocked ----
  BEGIN
    UPDATE inventory_levels SET on_hand = 0 WHERE variant_id = v_a;
    RAISE EXCEPTION 'guard did not fire';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'on_hand changes only%' THEN RAISE; END IF;
  END;

  -- ---- admin RPC: a non-admin caller (auth.uid() is NULL under psql) is refused ----
  BEGIN
    PERFORM record_inventory_movements(jsonb_build_array(jsonb_build_object('variant_id', v_a, 'delta', 1, 'reason', 'receive')));
    RAISE EXCEPTION 'non-admin RPC succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- ---- admin RPC, impersonating an admin: system-only reasons are refused, an
  -- allowed reason writes a movement stamped with the caller's uid ----
  SELECT id INTO v_admin FROM profiles WHERE role = 'admin' LIMIT 1;
  IF v_admin IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

    BEGIN
      PERFORM record_inventory_movements(jsonb_build_array(jsonb_build_object('variant_id', v_a, 'delta', 1, 'reason', 'sale')));
      RAISE EXCEPTION 'admin RPC allowed a system-only reason';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%is not allowed from the admin%' THEN RAISE; END IF;
    END;

    SELECT * INTO v_mov_id FROM record_inventory_movements(
      jsonb_build_array(jsonb_build_object('variant_id', v_a, 'delta', 2, 'reason', 'receive', 'reference', 'rpc-test')));
    ASSERT v_mov_id IS NOT NULL, 'admin RPC returned no id';
    ASSERT (SELECT created_by FROM inventory_movements WHERE id = v_mov_id) = v_admin, 'movement created_by mismatch';
    ASSERT (SELECT delta FROM inventory_movements WHERE id = v_mov_id) = 2, 'movement delta mismatch';

    EXECUTE 'RESET request.jwt.claims';
  ELSE
    RAISE NOTICE 'no admin profile — RPC admin path not exercised';
  END IF;

  RAISE NOTICE 'inventory_scenarios: all assertions passed';
END $$;

DO $$
DECLARE
  p_a UUID; p_c UUID; p_k UUID; v_a UUID; v_b UUID; v_c UUID; v_k UUID; o UUID; n INTEGER; r RECORD;
  v_admin UUID;
BEGIN
  EXECUTE 'RESET request.jwt.claims';

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

  -- the storefront (anon) must see the reservation, not just the owner
  EXECUTE 'SET LOCAL ROLE anon';
  ASSERT (SELECT max_orderable FROM storefront_availability WHERE variant_id = v_a) = 4, 'anon does not see reservations';
  ASSERT (SELECT max_orderable FROM storefront_availability WHERE variant_id = v_k) = 2, 'anon kit max ignores reservations';
  EXECUTE 'RESET ROLE';

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

  -- ---- a kit line inside a PENDING order reserves its exploded parts ----
  -- A sits at on_hand 0 with 6 reserved and B at 3 with none; one pending kit
  -- (2×A + 1×B) must add to both, i.e. inventory_reserved explodes the line.
  INSERT INTO orders (line_items, shipping_address, total_price, currency_code, financial_status, fulfillment_status, expires_at, customer_email)
  VALUES (jsonb_build_array(jsonb_build_object('product_id', p_k, 'variant_id', v_k, 'quantity', 1, 'title', 'מארז בדיקה', 'price', '30')),
          '{}'::jsonb, 30, 'ILS', 'pending', 'unfulfilled', now() + interval '2 hours', 'test@example.com');
  ASSERT (SELECT reserved FROM inventory_reserved WHERE variant_id = v_a) = 8, 'pending kit did not reserve its A parts';
  ASSERT (SELECT reserved FROM inventory_reserved WHERE variant_id = v_b) = 1, 'pending kit did not reserve its B part';

  -- staff views: empty for postgres/anon, populated for service_role
  ASSERT NOT EXISTS (SELECT 1 FROM variant_stock), 'variant_stock visible without staff role';
  EXECUTE 'SET LOCAL ROLE service_role';
  ASSERT (SELECT status FROM variant_stock WHERE variant_id = v_a) = 'out', 'variant_stock status';
  ASSERT (SELECT status FROM variant_stock WHERE variant_id = v_c) = 'untracked', 'untracked status';
  ASSERT (SELECT can_build FROM kit_stock WHERE bundle_id = p_k) = 0, 'kit_stock';
  ASSERT (SELECT count(*) FROM inventory_movement_log WHERE variant_id = v_a) > 0, 'movement log';
  ASSERT (SELECT status FROM supply_stock WHERE sku = 'ZZ-BOX') = 'ok', 'supply_stock';
  EXECUTE 'RESET ROLE';

  -- the real admin path: role authenticated + an admin JWT, exactly what the
  -- browser sends. is_staff_or_service() → is_admin() must open the staff views.
  SELECT id INTO v_admin FROM profiles WHERE role = 'admin' LIMIT 1;
  IF v_admin IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    ASSERT (SELECT count(*) FROM variant_stock) > 0, 'admin sees no variant_stock rows';
    ASSERT (SELECT status FROM variant_stock WHERE variant_id = v_a) = 'out', 'admin variant_stock status';
    ASSERT (SELECT count(*) FROM inventory_movement_log) > 0, 'admin sees no inventory_movement_log rows';
    EXECUTE 'RESET ROLE';
    EXECUTE 'RESET request.jwt.claims';
  ELSE
    RAISE NOTICE 'no admin profile — staff views not exercised as an admin';
  END IF;

  EXECUTE 'SET LOCAL ROLE anon';
  -- anon has no GRANT at all on the staff views (REVOKE ALL ... FROM PUBLIC, anon in
  -- the migration), so this is a hard ACL denial, not an empty result set.
  BEGIN
    PERFORM 1 FROM variant_stock LIMIT 1;
    RAISE EXCEPTION 'anon queried variant_stock without error';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- kit_availability exposes can_build uncapped, so the hardening migration
  -- revoked it from anon as well: exact stock is never public.
  BEGIN
    PERFORM 1 FROM kit_availability LIMIT 1;
    RAISE EXCEPTION 'anon queried kit_availability without error';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  ASSERT EXISTS (SELECT 1 FROM storefront_availability WHERE variant_id = v_a), 'anon cannot read storefront_availability';
  EXECUTE 'RESET ROLE';

  RAISE NOTICE 'availability_scenarios: all assertions passed';
END $$;

ROLLBACK;
