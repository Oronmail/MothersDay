# Launch Plan

This file tracks the remaining work we already identified during the pre-launch audit and fixes pass.

## Current status

- Security, checkout hardening, accessibility cleanup, performance improvements, and build-time SEO prerendering are in place.
- Checkout is intentionally disabled until the payment service is connected.
- The next phase is manual QA, final content/SEO copy, and launch readiness verification.

## Immediate next steps

- Do a full manual audit on the deployed site and collect bugs, content issues, and UX rough edges.
- Decide the final SEO copy for the homepage, collections, products, and support/legal pages.
- Review the live site again after deployment before changing anything else.

## Before going live

- Run a live SEO check on the production domain:
  - homepage
  - one product page
  - one collection page
  - `robots.txt`
  - `sitemap.xml`
  - canonical, Open Graph, Twitter, and JSON-LD tags
- Set `VITE_SITE_URL` to the final production domain.
- Submit the sitemap in Google Search Console after the final domain and copy are confirmed.
- PayPlus is wired (2026-09, branch `launch/payplus`): `create-payment` → hosted page
  redirect → HMAC-verified `payplus-callback` (+ IPN check on return) → paid → email.
  Follow `docs/payplus-go-live.md`: apply the two pending Supabase migrations, add the
  PayPlus env vars, test on a preview deployment, then enable
  `VITE_CHECKOUT_ENABLED=true` + `CHECKOUT_ENABLED=true` in Production.
- After the launch/payplus admin build is live in Production: run a migration
  `ALTER TABLE products DROP COLUMN IF EXISTS inventory_quantity;` (the form stopped writing it
  in commit 6dcbd40).

## Quality and UX follow-up

- Fix issues found in the manual audit.
- Finish the remaining repo-wide lint cleanup outside the files already repaired.
- Do one more accessibility pass on navigation, buttons, forms, and keyboard behavior.
- Recheck mobile performance and asset sizes after the final content is locked.
- Confirm analytics events are firing correctly on the final deployed site.

## Security and operations

- `.env` is untracked; rotate the historical secrets (old Shopify token, site password)
  noted in SECURITY-TODO.md, and rotate the Supabase anon key if the Jan-2026 tracked
  `.env` was never purged from git history.
- Verify Vercel environment variables are correct for production.
- Review Supabase permissions and admin/API access before launch.
- After payment goes live, consider adding rate limiting or abuse protection to order/payment endpoints.

## Launch checklist

- Final content approved
- SEO copy approved
- Payment connected and tested
- Checkout enabled
- Manual QA completed
- Production deploy verified
- Sitemap submitted
- Monitoring/logs checked after release
