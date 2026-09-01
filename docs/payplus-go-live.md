# PayPlus go-live runbook

**Status as of 1 Sep 2026, afternoon** — live checklist first, full reference below.

## ✅ Done

- [x] Migrations `20260611170000` (product fields) + `20260901120000` (payments & hardening) applied and sanity-checked
- [x] PayPlus dashboard configured, **Invoice+ subscribed**; invoice flow wired in code (commit `0281ac1`)
- [x] PayPlus credentials in Vercel **Production** — verified working against PayPlus's live API
- [x] PayPlus credentials + `CHECKOUT_ENABLED`/`VITE_CHECKOUT_ENABLED=true` + Resend email vars in **Preview** (note: the checkout flags exist in Preview ONLY — filter the env list by environment to see them; Production has none on purpose until launch)
- [x] `ORDER_ACCESS_SECRET` in all environments
- [x] **Protection Bypass for Automation** enabled (system env var; code appends it to PayPlus URLs on previews)

## ⏳ Remaining

1. **Preview payment test — ready NOW, nothing blocks it.** Guest checkout doesn't need the Supabase items below.
   - Open the branch preview (Vercel login needed to view):
     `https://mothers-day-git-launch-payplus-oronmails-projects.vercel.app`
   - Add a cheap product (בלוק תכנון קטן, ₪25) → checkout as **guest** with a real card.
   - Expect: PayPlus page → pay → confirmation shows paid + card last-4 → email arrives (with invoice link once the invoice migration is in) → admin order shows the payment card → PayPlus panel shows the transaction.
   - Then: **refund it from the PayPlus dashboard** → the order flips to `refunded` by itself.
   - Also try: cancel on the PayPlus page (→ back at checkout, cart intact) and a declined attempt if possible.
2. **Supabase dashboard tasks — currently blocked by the status.supabase.com auth incident** (try an incognito window first; `ERR_TOO_MANY_REDIRECTS` is often just cookies). When you're back in:
   - Run migration `20260901150000_invoice_fields.sql` (2 columns, 10 seconds) — until then invoices simply aren't linked, nothing breaks.
   - Authentication → URL Configuration → Redirect URLs (section 3.5 below) — until then, login-from-checkout falls back to the homepage; guest checkout unaffected.
3. **`VITE_SENTRY_DSN`** (recommended): Sentry → your project → Settings → Client Keys (DSN) → copy the `https://…ingest…sentry.io/…` URL → Vercel env for Production + Preview.
4. **Eden's sign-off** on the copy decisions (cancellation fee waived, 14-day defect window, delivery ranges, newsletter promise, Terms/Privacy rewrite).
5. **Production cutover** (section 5 below): add `CHECKOUT_ENABLED` + `VITE_CHECKOUT_ENABLED` = `true` in Production → redeploy → one real charge + refund → delete April test orders #8–#19 → submit sitemap.
6. **After testing**: regenerate the automation-bypass secret (Deployment Protection page) and consider PR + merge `launch/payplus` → `main` (that's what puts all of this live).

---

# Reference (original steps)

## 1. Apply the database migrations (one-time, ~1 minute)

Two migration files are pending in `supabase/migrations/`:

1. `20260611170000_product_admin_fields.sql` — product admin fields (sku, stock, weight…)
2. `20260901120000_payments_and_hardening.sql` — payment columns, `payment_events`,
   `mark_order_paid()`, drops the anon orders-insert policy, admin read on addresses,
   `is_admin()` hardening, drops the dead `unlinked_orders` table and stale storage policies.

Either paste each file into the **Supabase Dashboard → SQL Editor** (project
`yptpcpxyefboptosfxkh`, run 20260611 first, then 20260901), or from a terminal with
the database password:

```bash
supabase link --project-ref yptpcpxyefboptosfxkh   # asks for the DB password
supabase db push                                    # applies pending migrations
```

Safe while checkout is off: everything is additive except dropping a policy and a
table nothing uses.

Sanity check afterwards (SQL editor):

```sql
select column_name from information_schema.columns
 where table_name = 'orders' and column_name in ('paid_at','payment_page_request_uid','customer_email');
select policyname from pg_policies where tablename = 'orders';  -- "Insert orders" must be GONE
select proname from pg_proc where proname = 'mark_order_paid';
```

## 2. PayPlus dashboard once-over

- Copy from the dashboard (per the onboarding email): **API Key**, **Secret Key**,
  **Payment Page UID** (and note Terminal UID for support calls).
- On the payment page settings: language Hebrew, currency ILS, enable the payment
  methods you want (credit cards; Bit / Apple Pay / Google Pay if approved).
- The success-redirect method (GET vs POST) can stay at its default — the site
  handles both.
- **חשבונית+ — decided and wired (2026-09-01):** the business subscribed;
  `generateLink` sends `initial_invoice: true` + `paying_vat: true`, the callback
  stores the document number/URL on the order, the admin shows a link, and the
  confirmation email links the invoice. Requires migration
  `20260901150000_invoice_fields.sql` (2 columns). Kill switch:
  `PAYPLUS_INVOICE_ENABLED=false`.

## 3. Vercel environment variables

Values live only in the PayPlus dashboard — never commit them. Either add them in
Vercel → Project `mothers-day` → Settings → Environment Variables, or:

```bash
vercel env add PAYPLUS_API_KEY production        # paste the API key
vercel env add PAYPLUS_SECRET_KEY production     # paste the secret key
vercel env add PAYPLUS_PAYMENT_PAGE_UID production
# Preview gets the same values for now (PayPlus gave us production credentials only;
# tests are low-amount real charges per their own onboarding email, refunded after):
vercel env add PAYPLUS_API_KEY preview
vercel env add PAYPLUS_SECRET_KEY preview
vercel env add PAYPLUS_PAYMENT_PAGE_UID preview
```

`PAYPLUS_API_BASE` is optional — unset means production
(`https://restapi.payplus.co.il/api/v1.0`). If PayPlus ever provides staging
credentials, set it to `https://restapidev.payplus.co.il/api/v1.0` in Preview.

Already set: `ORDER_ACCESS_SECRET` (all envs, added 2026-09-01). Still missing and
recommended: `VITE_SENTRY_DSN` (create a Sentry project; CSP already allows the
ingest hosts).

Enable checkout **in Preview only** for testing:

```bash
vercel env add CHECKOUT_ENABLED preview        # value: true
vercel env add VITE_CHECKOUT_ENABLED preview   # value: true
```

Note: this project HAS Deployment Protection on Previews (verified — anonymous
requests get 401). Two ways to let PayPlus reach the preview callback:
- **Recommended:** Vercel → Settings → Deployment Protection → enable
  **Protection Bypass for Automation**. Vercel then injects
  `VERCEL_AUTOMATION_BYPASS_SECRET`, and `create-payment` automatically appends
  the bypass token to the PayPlus callback/return URLs on non-production
  deployments (already coded; never in production). Redeploy the preview after
  enabling. **Security note:** the token rides in those URLs (Vercel's documented
  query-param mechanism), so PayPlus stores it in the refURL fields and it appears
  briefly in the tester's browser — it grants preview-view access only, but treat
  it as a test-window secret: **regenerate it in the same settings screen when
  preview testing is done.**
- Or temporarily switch Vercel Authentication to "Only Production" and skip the
  bypass entirely.

## 3.5 Supabase Auth redirect list (one-time)

The login flow now returns customers to checkout (`/auth?next=/checkout`), and
Supabase only honors redirects that are allow-listed. In the Supabase dashboard →
**Authentication → URL Configuration → Redirect URLs**, add:

```
https://www.mothersday.co.il/*
https://mothersday.co.il/*
https://*-oronmails-projects.vercel.app/*
http://localhost:8080/*
```

(While you're there, Site URL should be `https://www.mothersday.co.il`.)

## 4. Test on a preview deployment

Push the branch → Vercel builds a preview. On the preview URL:

1. Order + pay a low-amount product with a real card → order flips to `paid`,
   confirmation shows the card's last 4, email arrives, cart empties,
   admin shows the transaction details. Refund it from the PayPlus dashboard →
   order flips to `refunded`.
2. Decline path: cancel on the hosted page → back at checkout with the cart intact.
3. Replay the callback (PayPlus panel "resend" if available) → no second email.
4. Check `payment_events` rows in Supabase for each step.

## 5. Production cutover

1. `CHECKOUT_ENABLED=true` + `VITE_CHECKOUT_ENABLED=true` in **Production**, redeploy.
2. One real low-amount charge end-to-end, then refund it from the PayPlus dashboard
   (their onboarding email recommends exactly this, ideally once per card brand).
3. Delete the 11 test orders from April (order_number 8–19) in Supabase if you want
   clean books: `delete from orders where order_number between 8 and 19;`
4. Submit the sitemap in Search Console; watch Vercel logs + PayPlus transactions
   panel for the first day.

## Rollback

Set `CHECKOUT_ENABLED=false` + `VITE_CHECKOUT_ENABLED=false` in Production and
redeploy — the store returns to "הזמנות אונליין ייפתחו בקרוב" mode. Orders already
paid are unaffected.
