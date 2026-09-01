-- Invoice+ (חשבונית+): PayPlus issues a tax invoice/receipt automatically per
-- charge; the callback stores the document reference on the order so the admin
-- and the confirmation email can link it.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_url    TEXT;

-- Consent audit: the checkout form requires accepting the site terms before an
-- order can be created; record when that happened.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
