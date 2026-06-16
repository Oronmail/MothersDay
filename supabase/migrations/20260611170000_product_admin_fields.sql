-- Product admin fields
-- Adds the merchandising/logistics fields the product admin form now exposes,
-- grouped in the UI under "מכירות" (sales), "משלוח" (shipping) and "מדיה" (media).
-- All additive + nullable, so existing rows and reads are unaffected.
--
-- Note: per-variant `sku` / `available_for_sale` already live on product_variants.
-- These product-level columns cover the common simple (single-variant) product.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku TEXT,                       -- מק"ט (product-level)
  ADD COLUMN IF NOT EXISTS inventory_quantity INTEGER,     -- מלאי (NULL = לא נמדד)
  ADD COLUMN IF NOT EXISTS weight_grams NUMERIC,           -- משקל פיזי למשלוח (גרם)
  ADD COLUMN IF NOT EXISTS package_length_cm NUMERIC,      -- מידות אריזה — אורך (ס"מ)
  ADD COLUMN IF NOT EXISTS package_width_cm NUMERIC,       -- מידות אריזה — רוחב (ס"מ)
  ADD COLUMN IF NOT EXISTS package_height_cm NUMERIC,      -- מידות אריזה — גובה (ס"מ)
  ADD COLUMN IF NOT EXISTS video_url TEXT;                 -- וידאו מוצר (קישור)
