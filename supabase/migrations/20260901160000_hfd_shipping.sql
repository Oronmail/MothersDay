-- HFD shipping (משלוחים): the admin "שדר משלוח ל-HFD" action creates a shipment
-- via HFD's REST API (api/hfd-shipment.ts, service role only — the admin client
-- never writes these). shipment_number drives label printing and cancellation;
-- rand_number builds the public tracking page (https://run.hfd.co.il/info/{rand}).
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS hfd_shipment_number      TEXT,
  ADD COLUMN IF NOT EXISTS hfd_rand_number          TEXT,
  ADD COLUMN IF NOT EXISTS hfd_shipment_created_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hfd_shipment_cancelled_at TIMESTAMPTZ;
