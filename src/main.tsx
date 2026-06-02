import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import * as Sentry from "@sentry/react";
import { initAnalytics } from "./lib/analytics";
import { initSentry } from "./lib/sentry";
import App from "./App.tsx";
import "./index.css";

// Supabase password-recovery links redirect to an allow-listed URL and append
// the recovery token in the URL hash (#...type=recovery). When the specific
// redirect isn't honored, that lands on the site root instead of /reset-password.
// Catch it here — synchronously, before the Supabase client consumes the hash —
// and route to the reset page with the token intact, wherever the link landed.
const isRecoveryLanding =
  window.location.hash.includes("type=recovery") &&
  window.location.pathname !== "/reset-password";

if (isRecoveryLanding) {
  window.location.replace(
    `/reset-password${window.location.search}${window.location.hash}`,
  );
} else {
  // Initialize Sentry error tracking
  initSentry();
  initAnalytics();

  createRoot(document.getElementById("root")!).render(
    <HelmetProvider>
      <Sentry.ErrorBoundary fallback={<ErrorFallback />} showDialog>
        <App />
      </Sentry.ErrorBoundary>
    </HelmetProvider>
  );
}

// Simple error fallback component
function ErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-normal text-foreground">משהו השתבש</h1>
        <p className="text-muted-foreground">
          אנו מצטערים, אירעה שגיאה בלתי צפויה. הצוות שלנו קיבל התראה ועובד על תיקון הבעיה.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-primary-foreground px-6 py-3 hover:bg-primary/90 transition-colors"
        >
          רענן את הדף
        </button>
      </div>
    </div>
  );
}
