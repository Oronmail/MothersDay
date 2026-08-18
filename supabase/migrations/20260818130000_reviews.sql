-- Product reviews submitted from the product page ("שתפי אותנו בחוויה שלך").
-- Every submission lands as 'pending' and appears on the site only after an
-- admin approves it in /admin/reviews.
--
-- Until this migration runs in production, the site keeps working: the
-- product page detects the missing table (PGRST205/42P01) and shows only the
-- curated reviews from src/data/productReviews.ts, and the review form shows
-- a friendly error on submit.

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_handle TEXT NOT NULL,
  product_title TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 2 AND 2000),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  kids_count TEXT CHECK (kids_count IS NULL OR char_length(kids_count) <= 40),
  kids_ages TEXT CHECK (kids_ages IS NULL OR char_length(kids_ages) <= 80),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS reviews_handle_status_idx ON reviews (product_handle, status);
CREATE INDEX IF NOT EXISTS reviews_status_created_idx ON reviews (status, created_at DESC);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone (guest or logged-in) may submit, but only as a pending review,
-- and may not attribute it to another user.
DROP POLICY IF EXISTS "Public submit pending review" ON reviews;
CREATE POLICY "Public submit pending review" ON reviews
  FOR INSERT WITH CHECK (
    status = 'pending' AND (user_id IS NULL OR user_id = auth.uid())
  );

-- The site shows approved reviews only.
DROP POLICY IF EXISTS "Public read approved reviews" ON reviews;
CREATE POLICY "Public read approved reviews" ON reviews
  FOR SELECT USING (status = 'approved');

-- Admins moderate: see everything, approve/reject, delete.
-- is_admin() is defined in 001_schema.sql / 002_rls.sql and already exists in
-- production (the newsletter policies use it).
DROP POLICY IF EXISTS "Admin read all reviews" ON reviews;
CREATE POLICY "Admin read all reviews" ON reviews
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admin update reviews" ON reviews;
CREATE POLICY "Admin update reviews" ON reviews
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admin delete reviews" ON reviews;
CREATE POLICY "Admin delete reviews" ON reviews
  FOR DELETE USING (is_admin());
