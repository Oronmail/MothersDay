-- Fix newsletter_subscribers table security issues

-- Drop the overly permissive SELECT policy that allows anyone to read all email addresses
DROP POLICY IF EXISTS "Anyone can check if email exists" ON public.newsletter_subscribers;

-- The INSERT policy is fine as-is for public newsletter signups
-- We don't need a SELECT policy since the unique constraint on email already handles duplicates
-- This prevents email enumeration attacks