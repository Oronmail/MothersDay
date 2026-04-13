-- Add explicit deny policies for INSERT, UPDATE, DELETE on orders table
-- Orders should only be created by the Shopify webhook (edge function with service role)

-- Deny direct INSERT from authenticated users
CREATE POLICY "No direct insert to orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Deny direct UPDATE from authenticated users  
CREATE POLICY "No direct update to orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (false);

-- Deny direct DELETE from authenticated users
CREATE POLICY "No direct delete from orders"
ON public.orders
FOR DELETE
TO authenticated
USING (false);