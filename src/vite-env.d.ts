/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_CHECKOUT_ENABLED?: string;
  readonly VITE_PAYMENT_SIMULATION_ENABLED?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_INSTAGRAM_URL?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_META_PIXEL_ID?: string;
}

/** Meta Pixel function: callable queue until fbevents.js loads, then live. */
interface MetaPixel {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  push?: MetaPixel;
  loaded?: boolean;
  version?: string;
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
  fbq?: MetaPixel;
  _fbq?: MetaPixel;
}
