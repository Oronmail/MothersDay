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
- Reconnect the payment provider and verify:
  - payment creation
  - callback handling
  - successful paid order flow
  - failed payment flow
  - confirmation page behavior
- Re-enable checkout only after payment tests pass:
  - `VITE_CHECKOUT_ENABLED=true`
  - `CHECKOUT_ENABLED=true`

## Quality and UX follow-up

- Fix issues found in the manual audit.
- Finish the remaining repo-wide lint cleanup outside the files already repaired.
- Do one more accessibility pass on navigation, buttons, forms, and keyboard behavior.
- Recheck mobile performance and asset sizes after the final content is locked.
- Confirm analytics events are firing correctly on the final deployed site.

## Security and operations

- Remove `.env` from git tracking and rotate secrets listed in [SECURITY-TODO.md](/Users/oronsmac/MothersDay/SECURITY-TODO.md).
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
