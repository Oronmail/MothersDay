-- Fix orders table: remove Shopify-era columns, add order_number, fix total_price type
-- This completes the Shopify decoupling for the orders table

-- Drop Shopify-specific unique constraint first
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_shopify_order_id_key;

-- Drop old Shopify columns that are no longer needed
ALTER TABLE orders DROP COLUMN IF EXISTS shopify_order_id;
ALTER TABLE orders DROP COLUMN IF EXISTS shopify_order_number;
ALTER TABLE orders DROP COLUMN IF EXISTS order_status;

-- Add order_number (auto-incrementing) if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'order_number'
  ) THEN
    CREATE SEQUENCE IF NOT EXISTS orders_order_number_seq;
    ALTER TABLE orders ADD COLUMN order_number INTEGER NOT NULL DEFAULT nextval('orders_order_number_seq');
  END IF;
END $$;

-- Change total_price from TEXT to NUMERIC if it's still TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders'
      AND column_name = 'total_price' AND data_type = 'text'
  ) THEN
    ALTER TABLE orders ALTER COLUMN total_price TYPE NUMERIC USING total_price::NUMERIC;
  END IF;
END $$;
