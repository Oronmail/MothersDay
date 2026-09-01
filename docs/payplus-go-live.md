# PayPlus go-live runbook

**Status as of 1 Sep 2026, end of day** — payments are DONE and tested with real money; the site is deployed to production with the store closed. Live checklist first, full reference below.

## ✅ Done (verified live)

- [x] All 3 migrations applied (product fields, payments & hardening, invoice/consent fields)
- [x] PayPlus credentials verified against their production API; env complete in Production + Preview
- [x] **Real payment tests on the preview:** order #23 (₪85, paid → same-day void reflected as refunded) and #24 (₪60, paid; refund pending). Declined card-check, cancel-path, HMAC verification, idempotency and void handling all exercised with live traffic
- [x] **Invoice+ final mode:** our server creates the tax invoice via the books API right after the charge (instant, `prevent_email`) — document #4001 created as proof; panel auto-generation turned OFF (it had produced the duplicate #4000); invoice link stored on the order, shown in admin, on the confirmation page and in the email
- [x] Supabase Auth redirect URLs configured; `VITE_SENTRY_DSN` set (Production + Preview; activates on each new build)
- [x] Confirmation email redesigned from the package-card artwork (wine header, closing line, invoice link, mobile-fluid); test email delivered
- [x] **Production deployed from `main`** with `CHECKOUT_ENABLED=false` + `VITE_CHECKOUT_ENABLED=false` — everything is live except purchasing

## ⏳ Remaining

1. **PayPlus panel housekeeping:** cancel duplicate document **#4001** (the API one; #4000 stays), and **refund the ₪60** of order #24.
2. **Eden's review** on the live site: the rewritten Terms/Returns/Shipping/Privacy, the softened newsletter promise, checkout look (asterisks, no payment box), and the new email design.
3. **Before launch:** delete the test orders (April's #8–#19 and today's #22–#24) — `delete from orders where order_number between 8 and 24;` — and regenerate the automation-bypass secret (Deployment Protection page).
4. **Cutover:** set the two checkout flags to `true` in Production, redeploy, one last real charge + refund, submit the sitemap in Search Console, watch Sentry + the PayPlus panel for the first day.
5. Rollback stays: flags to `false`, redeploy.

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
- **חשבונית+ — decided and wired (2026-09-01, "api" mode):** right after a
  verified charge the server creates the tax invoice/receipt itself
  (`POST /books/docs/new/inv_tax_receipt`, linked by `transaction_uuid`,
  `prevent_email: true`) — so PayPlus sends the customer nothing; the document
  number/URL is stored on the order, shown in the admin, linked on the
  confirmation page and in our confirmation email. Do NOT enable auto invoice
  generation in the PayPlus panel (double documents), and leave the Invoice+
  Callback URL empty. Requires migration `20260901150000_invoice_fields.sql`.
  Modes via `PAYPLUS_INVOICE_MODE`: `api` (default) / `auto` / `off`.

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
