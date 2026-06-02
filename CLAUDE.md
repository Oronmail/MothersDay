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
**CreditGuard / Hyp**. Some older docs (`PROJECT.md`, `SECURITY-TODO.md`) still mention
Shopify/Lovable and are **stale** — trust this file and the code over them.

## Tech stack

- **Frontend:** React 18 + TypeScript + Vite, Tailwind CSS + shadcn/ui (Radix), RTL/Hebrew
- **State:** Zustand (cart, persisted to localStorage) + React Query (server data)
- **Backend:** Supabase (Postgres + Auth + RLS) and Vercel **serverless functions** in `api/`
- **Email:** Resend (order confirmations)
- **Payments:** CreditGuard / **Hyp** (Israeli processor) — XML API, hosted payment page in iframe
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
- `create-payment.ts` — starts a Hyp payment session, returns hosted payment URL for the iframe.
- `payment-callback.ts` — Hyp redirects here; validates MAC, marks order `paid`, redirects to confirmation.
- `simulate-payment.ts` — dev/test only: marks paid + sends email. Gated by `VITE_PAYMENT_SIMULATION_ENABLED`.
- `get-order.ts` — fetches an order for the confirmation page (validates access token, service role).
- `robots.ts`, `sitemap.ts` — served at `/robots.txt` and `/sitemap.xml` via `vercel.json` rewrites.
- `api/_lib/` — `checkout.ts` (feature-flag helpers), `orderAccess.ts` (HMAC guest-order tokens),
  `orderConfirmationEmail.ts` (Resend email), `siteUrl.ts` (resolve base URL).

## Supabase schema (high level)

Tables: `products`, `product_images`, `product_variants`, `variant_options`, `collections`,
`collection_products`, `bundle_items`, `orders` (line_items + shipping_address as JSONB),
`profiles` (role `customer`|`admin`), `addresses`, `wishlists`, `store_settings`
(shipping_enabled, shipping_cost, free_shipping_threshold). RLS blocks anon writes to `orders`,
so guest checkout must go through the service-role API functions.

## Checkout / payment flow

`Checkout.tsx` → validate (Zod) → compute shipping (35₪ if subtotal < 350₪, else free) →
`cartStore.createOrder()` → `/api/create-order`. Then, depending on flags:
- `VITE_CHECKOUT_ENABLED=true` → `/api/create-payment` → Hyp iframe → `/api/payment-callback` → confirmation.
- `VITE_PAYMENT_SIMULATION_ENABLED=true` → `/api/simulate-payment` (dev) → confirmation.

**Feature flags (currently OFF for production until payments are verified):**
`VITE_CHECKOUT_ENABLED`, `CHECKOUT_ENABLED`, `VITE_PAYMENT_SIMULATION_ENABLED`, `PAYMENT_SIMULATION_ENABLED`.

## Environment variables

Local `.env` is **not** tracked by git (correctly ignored). It needs (frontend can run with the first two):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, plus server-side `SUPABASE_Secret_KEY` (service role)
and `resend_KEY` / `RESEND_API_KEY` (code accepts either name).

Full set the code reads (server vars are configured in the **Vercel dashboard** for production):
- Public: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`, `VITE_SITE_PASSWORD`,
  `VITE_GA_MEASUREMENT_ID`, `VITE_SENTRY_DSN`, `VITE_INSTAGRAM_URL`,
  `VITE_CHECKOUT_ENABLED`, `VITE_PAYMENT_SIMULATION_ENABLED`.
- Server: `SUPABASE_Secret_KEY` (service role), `RESEND_API_KEY`/`resend_KEY`,
  `ORDER_CONFIRMATION_FROM_EMAIL`/`RESEND_FROM_EMAIL`, `ORDER_CONFIRMATION_REPLY_TO`, `SUPPORT_EMAIL`,
  `ORDER_ACCESS_SECRET` (falls back to `SUPABASE_Secret_KEY`),
  Hyp: `HYP_SERVER_URL`, `HYP_USER`, `HYP_PASSWORD`, `HYP_TERMINAL`, `HYP_MID`,
  `CHECKOUT_ENABLED`, `PAYMENT_SIMULATION_ENABLED`.

## SEO build step

`scripts/prerender-seo.ts` runs after `vite build`: writes per-route static HTML shells under
`dist/<route>/index.html` (title, meta description, Open Graph, Twitter, canonical, JSON-LD) for
static routes plus dynamic products/collections pulled from Supabase. `vercel.json` also sets the
CSP and rewrites for SPA routing, robots, and sitemap.

## Conventions & gotchas

- Hebrew RTL throughout; keep copy in Hebrew.
- Never commit secrets; `.env` stays untracked.
- Anything that writes orders/payments must use a server-side function (RLS blocks anon writes).
- Older `.md` docs reference Shopify/Lovable — outdated; this file is the source of truth.
- The site is live but checkout is off — don't enable `*_CHECKOUT_ENABLED` without verifying the
  full Hyp payment + callback + confirmation + email flow first (see `PLAN.md`).
