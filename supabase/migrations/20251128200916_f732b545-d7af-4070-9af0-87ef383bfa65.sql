-- Create table for unlinked orders (orders that couldn't be matched to users)
CREATE TABLE public.unlinked_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id text NOT NULL UNIQUE,
  shopify_order_number text,
  order_email text,
  order_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_user_id uuid,
  notes text
);

-- Enable RLS
ALTER TABLE public.unlinked_orders ENABLE ROW LEVEL SECURITY;

-- Only admins can view unlinked orders
CREATE POLICY "Only admins can view unlinked orders"
ON public.unlinked_orders
FOR SELECT
TO authenticated
USING (false); -- Will be updated when admin roles are implemented

-- Create index for faster lookups
CREATE INDEX idx_unlinked_orders_email ON public.unlinked_orders(order_email);
CREATE INDEX idx_unlinked_orders_shopify_id ON public.unlinked_orders(shopify_order_id);