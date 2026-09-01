-- Invoice+ (חשבונית+): PayPlus issues a tax invoice/receipt automatically per
-- charge; the callback stores the document reference on the order so the admin
-- and the confirmation email can link it.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_url    TEXT;
