/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_CHECKOUT_ENABLED?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_INSTAGRAM_URL?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  gtag?: (
    command: "js" | "config" | "event",
    targetOrDate: string | Date,
    params?: Record<string, string | number | boolean | null | undefined | object>
  ) => void;
  dataLayer?: unknown[][];
  __analyticsInitialized?: boolean;
}
