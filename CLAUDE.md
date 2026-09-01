# CLAUDE.md — Project Context for AI Assistants

> Read this first in any new session. It captures the real, current architecture of the project
> so you start with full context instead of re-discovering everything.
>
> 👉 **עבודת עיצוב בתהליך:** אחרי הקובץ הזה, קרא את **`SESSION-NOTES.md`** — יומן ההמשך של
> עבודת העיצוב עם עדן (פונטים, heroes, header, כרטיסי מוצר, סידור מוצרים בניהול ועוד).
> כל השינויים שם הם **מקומיים בלבד, לא הועלו**. השיחה הבאה היא המשך ישיר.

## What this is

E-commerce website for **mothersday.co.il** — Hebrew (RTL) store selling planning/organization
products (planners, organizers, stationery). The site is technically **deployed** at
https://mothersday.co.il, but it is **not yet published/marketed to the general public**, and
**online selling (checkout) is intentionally disabled** — you cannot buy anything yet. It is in a
"built and ready, on hold" state, waiting for the payment provider to be connected and tested
before the official launch.

History: originally scaffolded in **Lovable** and connected to **Shopify**. The code has since
been **migrated off Shopify** — the catalog and orders now live in **Supabase**, and payments use
**PayPlus** (Israeli processor; the earlier CreditGuard/Hyp code was removed in 2026-09 without ever going live). Some older docs (`PROJECT.md`, `SECURITY-TODO.md`) still mention
Shopify/Lovable and are **stale** — trust this file and the code over them.

## Tech stack

- **Frontend:** React 18 + TypeScript + Vite, Tailwind CSS + shadcn/ui (Radix), RTL/Hebrew
- **State:** Zustand (cart, persisted to localStorage) + React Query (server data)
- **Backend:** Supabase (Postgres + Auth + RLS) and Vercel **serverless functions** in `api/`
- **Email:** Resend (order confirmations); Supabase Auth SMTP sends magic-link/signup emails
  (branded RTL templates in `supabase/email-templates/`, pasted into the Supabase dashboard)
- **Payments:** **PayPlus** (Israeli processor) — REST API (`docs.payplus.co.il`), hosted payment page via full-page redirect; orders are marked paid only by the HMAC-verified server callback (+ IPN cross-check)
- **Hosting:** Vercel, deployed from GitHub repo `Oronmail/MothersDay` (branch `main`)
- **Monitoring:** Sentry; Analytics: Google Analytics (`G-RZ3NF8NX21`)

## Local development

- **Node:** installed via Homebrew at `/opt/homebrew/bin/node` (this machine had no Node initially).
- Commands:
  - `npm install` — install deps
  - `npm run dev` — Vite dev server on **http://localhost:8080**
  - `npm run build` — `vite build` + `npm run prerender:seo`
  - `npm run lint` — ESLint
  - `npm run import:products` — import products from CSV into Supabase (`scripts/import-products.ts`)
  - `npm run seed:admin` — create an admin user (`scripts/seed-admin.ts`)
- Path alias: `@` → `src/`.

## Routes (src/App.tsx)

Lazy-loaded pages under a `SiteAccess` layout (optional password gate via `VITE_SITE_PASSWORD`):
`/` (Index), `/products`, `/sets`, `/product/:handle`, `/collection/:handle`, `/profile`,
`/orders`, `/wishlist`, `/about`, `/blog`, `/content-1..3`, `/shipping`, `/privacy`, `/terms`,
`/returns`, `/support`, `/checkout`, `/checkout/confirmation/:orderId`.
Outside the layout: `/auth`, `/admin/login`, `/admin/*` (AdminDashboard), `*` (NotFound).

## Key directories

- `src/pages/` — one component per route (see above).
- `src/components/` — UI; `ui/` = shadcn primitives, `admin/` = admin panel, `checkout/` = checkout steps.
- `src/stores/cartStore.ts` — Zustand cart: `addItem/updateQuantity/removeItem/clearCart/createOrder`.
- `src/lib/`:
  - `supabase.ts` — anon Supabase client (public reads only)
  - `api.ts` — product/collection/bundle queries + `transformProduct()`
  - `checkoutConfig.ts` — reads checkout/payment feature flags
  - `siteConfig.ts`, `analytics.ts`, `sentry.ts`
- `src/hooks/` — `useAuth`, `useAdmin`, `useAddToCart`, `useWishlist`, `useStoreSettings`.
- `api/` — Vercel functions (see below).
- `supabase/migrations/` — DB schema + RLS.
- `scripts/` — `prerender-seo.ts`, `import-products.ts`, `seed-admin.ts`.

## API layer (`api/` — Vercel serverless)

- `create-order.ts` — creates order in Supabase with **service role** (bypasses RLS), recomputes
  pricing server-side, normalizes phone to `+972`. Returns `{ orderId, orderNumber, orderAccessToken }`.
- `create-payment.ts` — creates/reuses a PayPlus `generateLink` hosted-page link for a pending order
  (amount from the order row, requires the order-access token), returns `paymentPageUrl` for a redirect.
- `payplus-callback.ts` — PayPlus server-to-server callback: verifies `hash` = HMAC-SHA256(secret, raw body),
  dedupes via `payment_events`, marks paid atomically via the `mark_order_paid()` RPC, sends the Resend email.
  Also handles declines (order stays `pending`) and refunds.
- `payplus-return.ts` — the customer returns here from the hosted page; never trusts the redirect params,
  confirms via `POST /PaymentPages/ipn`, then redirects to confirmation or back to `/checkout?payment=failed|cancelled`.
- `simulate-payment.ts` — dev/test only: marks paid + sends email. Gated by `VITE_PAYMENT_SIMULATION_ENABLED`.
- `get-order.ts` — fetches an order for the confirmation page (validates access token, service role).
- `gov-address.ts` — same-origin proxy for the data.gov.il cities/streets datasets used by the
  checkout address autocomplete (data.gov.il stopped sending CORS headers, so the browser can't
  call it directly; in local dev, `vite.config.ts` proxies the same path).
- `robots.ts`, `sitemap.ts` — served at `/robots.txt` and `/sitemap.xml` via `vercel.json` rewrites.
- `api/_lib/` — `checkout.ts` (feature-flag helpers), `orderAccess.ts` (HMAC guest-order tokens),
  `orderConfirmationEmail.ts` (Resend email), `siteUrl.ts` (resolve base URL).

## Supabase schema (high level)

Tables: `products`, `product_images`, `product_variants`, `variant_options`, `collections`,
`collection_products`, `bundle_items`, `orders` (line_items + shipping_address as JSONB),
`profiles` (role `customer`|`admin`), `addresses`, `wishlists`, `carts` (user_id PK + items
JSONB — mirror of the logged-in user's cart, see `useCartSync`), `reviews` (product reviews,
status `pending`|`approved`|`rejected`), `store_settings`
(shipping_enabled, shipping_cost, free_shipping_threshold). RLS blocks anon writes to `orders`,
so guest checkout must go through the service-role API functions.

**Product reviews:** the product-page form inserts directly into `reviews` (RLS allows public
INSERT pinned to `status='pending'`, like the newsletter forms). Moderation lives at
`/admin/reviews` (approve/reject/delete); only approved reviews render on the product page,
merged after the curated focus-group reviews from `src/data/productReviews.ts`
(see `src/hooks/useProductReviews.ts`). If migration `20260818130000_reviews.sql` hasn't been
applied yet, the site degrades gracefully (static reviews only, admin screen shows a setup note).

**Cart & wishlist persistence:** both survive refresh for guests via localStorage
(`cart-storage` in `cartStore.ts`, `wishlist-storage` in `wishlistStore.ts`). On login,
`AccountSync` (mounted in `SiteAccess`) merges the guest wishlist into `wishlists` and mirrors
the cart to `carts` (`useCartSync`). The `carts` migration (`20260818120000_carts.sql`) was
applied to prod on 2026-08-18; if the table were ever missing, cart sync disables itself
gracefully. Checkout prefills contact + shipping fields for logged-in users from `addresses`
(default/most recent) and `profiles`, and saves the address after a first order.

## Checkout / payment flow

`Checkout.tsx` → validate (Zod) → compute shipping (35₪ if subtotal < 350₪, else free) →
`cartStore.createOrder()` → `/api/create-order` (prices/shipping recomputed server-side; user derived
from the Supabase JWT in the `Authorization` header; the cart is NOT cleared yet). Then, per flags:
- `VITE_CHECKOUT_ENABLED=true` (+ server `CHECKOUT_ENABLED=true`) → `/api/create-payment` → full-page
  redirect to the PayPlus hosted page → PayPlus POSTs `/api/payplus-callback` (marks paid, emails) and
  sends the browser to `/api/payplus-return` → `/checkout/confirmation/:orderId?token=…`. The confirmation
  page shows paid vs "מאמתים את התשלום" (brief polling), clears the cart and fires the GA `purchase`
  event only once the order is actually `paid`. Declined/cancelled → `/checkout?payment=failed|cancelled`.
- `VITE_PAYMENT_SIMULATION_ENABLED=true` → `/api/simulate-payment` (dev only; server refuses when
  `VERCEL_ENV=production`) → confirmation.

**Feature flags (currently OFF for production until payments are verified):**
`VITE_CHECKOUT_ENABLED` (client) and `CHECKOUT_ENABLED` (server) — BOTH must be `true`; the server no
longer falls back to the `VITE_` value. `VITE_PAYMENT_SIMULATION_ENABLED`/`PAYMENT_SIMULATION_ENABLED`
enable the fake-payment dev flow (hard-refused in the production environment).

## Environment variables

Local `.env` is **not** tracked by git (correctly ignored). It needs (frontend can run with the first two):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, plus server-side `SUPABASE_Secret_KEY` (service role)
and `resend_KEY` / `RESEND_API_KEY` (code accepts either name).

Full set the code reads (server vars are configured in the **Vercel dashboard** for production):
- Public: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`, `VITE_SITE_PASSWORD`,
  `VITE_GA_MEASUREMENT_ID`, `VITE_SENTRY_DSN`, `VITE_INSTAGRAM_URL`,
  `VITE_CHECKOUT_ENABLED`, `VITE_PAYMENT_SIMULATION_ENABLED`,
  `VITE_META_PIXEL_ID` (Meta/Instagram Pixel — unset until the Meta Business account exists;
  all funnel events go through `src/lib/tracking.ts`, which fans out to GA4 + Meta Pixel).
- Server: `SUPABASE_Secret_KEY` (service role), `RESEND_API_KEY`/`resend_KEY`,
  `ORDER_CONFIRMATION_FROM_EMAIL`/`RESEND_FROM_EMAIL`, `ORDER_CONFIRMATION_REPLY_TO`, `SUPPORT_EMAIL`,
  `ORDER_ACCESS_SECRET` (dedicated HMAC secret for order-access tokens; set in all Vercel envs),
  PayPlus: `PAYPLUS_API_KEY`, `PAYPLUS_SECRET_KEY`, `PAYPLUS_PAYMENT_PAGE_UID`,
  `PAYPLUS_API_BASE` (default production `https://restapi.payplus.co.il/api/v1.0`; staging `restapidev`),
  `CHECKOUT_ENABLED`, `PAYMENT_SIMULATION_ENABLED`.

## SEO build step

`scripts/prerender-seo.ts` runs after `vite build`: writes per-route static HTML shells under
`dist/<route>/index.html` (title, meta description, Open Graph, Twitter, canonical, JSON-LD) for
static routes plus dynamic products/collections pulled from Supabase. Since the 2026-08 SEO pass
it also: injects **static body content into `#root`** (real text for crawlers that don't run JS —
AI bots; React replaces it on hydration), writes **noindex shells** for app routes
(/checkout, /profile, /orders, /wishlist, /auth, /reset-password, /admin/login), and adds
FAQPage (/support, from `src/content/faq.ts`), Article (content-1..3), ItemList (/products, /sets)
and enriched Organization/WebSite JSON-LD (site name "יום האם" for Google's site-name display).
Canonical domain is **https://www.mothersday.co.il** (fallback if `VITE_SITE_URL` is unset — set it
in Vercel!). `public/robots.txt` was deleted on purpose: it used to shadow the `/api/robots`
rewrite with a stale vercel.app sitemap URL; robots is served by `api/robots.ts` (which also
explicitly allows AI crawlers). `public/llms.txt` describes the brand for LLM crawlers.
`vercel.json` also sets the CSP and rewrites for SPA routing, robots, and sitemap.

## Conventions & gotchas

- Hebrew RTL throughout; keep copy in Hebrew.
- Never commit secrets; `.env` stays untracked.
- Anything that writes orders/payments must use a server-side function (RLS blocks anon writes).
- Older `.md` docs reference Shopify/Lovable — outdated; this file is the source of truth.
- The site is live but checkout is off — don't enable `*_CHECKOUT_ENABLED` in Production without
  running the full PayPlus flow (link → hosted page → callback → paid → email → confirmation) on a
  Preview deployment first, and a real low-amount charge + refund in Production (see `PLAN.md`).
- Orders schema: payment columns + `payment_events` + `mark_order_paid()` live in
  `supabase/migrations/20260901120000_payments_and_hardening.sql` — the API assumes it is applied.
