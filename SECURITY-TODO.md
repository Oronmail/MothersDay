# Security Cleanup — mothersdayil

The `.env` file is currently tracked in git with real secrets. This was flagged in a Jan 2026 audit.

## When ready, do the following:

1. **Set env vars in Lovable dashboard** (and Shopify admin for storefront token):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SHOPIFY_STOREFRONT_TOKEN`
   - `VITE_SITE_PASSWORD`
   - `VITE_SENTRY_DSN`

2. **Remove `.env` from git tracking** (keeps the local file, just stops tracking):
   ```bash
   git rm --cached .env
   git commit -m "Remove .env from tracking"
   git push
   ```

3. **Rotate these secrets:**
   - Shopify Storefront Access Token
   - Site password (currently `mt` — very weak)
   - Optionally: Sentry DSN, Supabase anon key
