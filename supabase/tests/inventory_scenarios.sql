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
