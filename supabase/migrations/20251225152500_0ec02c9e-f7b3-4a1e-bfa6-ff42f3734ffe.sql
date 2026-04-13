-- Add explicit SELECT policy to block public read access to newsletter subscribers
-- Only backend/service role can access this data for admin purposes
CREATE POLICY "No public read access to newsletter subscribers"
ON public.newsletter_subscribers
FOR SELECT
USING (false);