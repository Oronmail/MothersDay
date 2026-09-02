-- Audit stamp for the "ההזמנה בדרך" email sent when an HFD shipment is created
-- (api/hfd-shipment.ts), mirroring confirmation_email_sent_at.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipped_email_sent_at TIMESTAMPTZ;
