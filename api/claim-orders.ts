import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/claim-orders
 *
 * Attaches past guest orders to the logged-in customer. Safe by construction:
 * the target user comes only from a verified Supabase JWT, and logging in
 * proved she owns that email address — so orders placed as a guest with the
 * same email are hers. Called fire-and-forget after login (AccountSync).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_Secret_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing Supabase configuration" });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  const { data: authData } = await supabase.auth.getUser(authHeader.slice(7));
  const user = authData?.user;
  const email = user?.email?.trim().toLowerCase();
  if (!user || !email) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  // ilike is used only for case-insensitivity — escape its wildcards so an
  // underscore in the email can't match other addresses.
  const emailPattern = email.replace(/([\\%_])/g, "\\$1");

  let claimed = 0;
  for (const column of ["customer_email", "guest_email"] as const) {
    const { data, error } = await supabase
      .from("orders")
      .update({ user_id: user.id })
      .is("user_id", null)
      .ilike(column, emailPattern)
      .select("id");
    if (error) {
      console.error(`claim-orders: update by ${column} failed`, error);
      return res.status(500).json({ ok: false, error: "claim_failed" });
    }
    claimed += data?.length ?? 0;
  }

  return res.status(200).json({ ok: true, claimed });
}
