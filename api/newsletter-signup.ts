import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { sendWelcomeEmail } from "./_lib/welcomeEmail.js";

/**
 * POST /api/newsletter-signup
 *
 * Subscribes an email to the newsletter and sends the branded welcome email
 * carrying the WELCOME10 code. The unique constraint on the email is the
 * anti-abuse valve: an address that is already subscribed never gets a second
 * email through this endpoint.
 *
 * The site's forms fall back to a direct (RLS-allowed) insert if this endpoint
 * is unreachable — signup must never break, the email is best-effort.
 */

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  source: z.string().trim().max(40).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parsed = requestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: "invalid_request" });
  }
  const { email, name, phone } = parsed.data;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_Secret_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing Supabase configuration" });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert({ email, name: name || null, phone: phone || null });

  if (error) {
    if (error.code === "23505") {
      // Already subscribed — fine, but no second welcome email.
      return res.status(200).json({ ok: true, already: true, emailSent: false });
    }
    console.error("newsletter-signup: insert failed", error);
    return res.status(500).json({ ok: false, error: "subscribe_failed" });
  }

  const emailResult = await sendWelcomeEmail({ to: email, name });
  if (!emailResult.sent) {
    console.error("newsletter-signup: welcome email not sent", email, emailResult.reason);
  }

  return res.status(200).json({ ok: true, already: false, emailSent: emailResult.sent });
}
