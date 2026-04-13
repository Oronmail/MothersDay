import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry error tracking
 * Only runs in production to avoid noise in development
 */
export const initSentry = () => {
  // Only initialize in production
  if (import.meta.env.MODE !== "production") {
    console.log("Sentry: Skipped initialization (not in production mode)");
    return;
  }

  // Check if DSN is configured
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.warn("Sentry: DSN not configured. Skipping initialization.");
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,

    // Enable logging for better debugging
    enableLogs: true,

    // Performance Monitoring & Logging
    integrations: [
      Sentry.browserTracingIntegration(),
    ],

    // Trace propagation targets - only our own domains, NOT third-party APIs
    // Removed myshopify.com because Shopify's CORS doesn't allow the 'baggage' header that Sentry injects
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/yomhaem\.co\.il/,
      /^https:\/\/mothersday\.co\.il/,
      /^https:\/\/.*\.supabase\.co/,
    ],

    // Set tracesSampleRate to 1.0 to capture 100% of transactions
    // Lower this in production to reduce data costs
    tracesSampleRate: 0.1, // 10% of transactions

    // Capture 100% of errors
    sampleRate: 1.0,

    // Enable session replay (optional - increases data usage)
    // replaysSessionSampleRate: 0.1, // 10% of sessions
    // replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Don't send events in development
      if (import.meta.env.MODE !== "production") {
        return null;
      }

      // Filter out localhost errors
      if (event.request?.url?.includes("localhost")) {
        return null;
      }

      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data?.password || breadcrumb.data?.token) {
            breadcrumb.data = { ...breadcrumb.data, password: "[Filtered]", token: "[Filtered]" };
          }
          return breadcrumb;
        });
      }

      return event;
    },

    // Ignore common browser errors
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      "Can't find variable: ZiteReader",
      "jigsaw is not defined",
      "ComboSearch is not defined",
      // Network errors
      "NetworkError",
      "Failed to fetch",
      // Random plugins/extensions
      "atomicFindClose",
      "fb_xd_fragment",
      "bmi_SafeAddOnload",
      "EBCallBackMessageReceived",
      // Safari specific
      "Non-Error promise rejection captured",
    ],

    // Sanitize URLs before sending to Sentry
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "xhr" || breadcrumb.category === "fetch") {
        // Remove query parameters that might contain sensitive data
        if (breadcrumb.data?.url) {
          try {
            const url = new URL(breadcrumb.data.url);
            url.search = ""; // Remove query params
            breadcrumb.data.url = url.toString();
          } catch {
            // Invalid URL, leave as is
          }
        }
      }
      return breadcrumb;
    },
  });

  console.log("Sentry: Initialized successfully");
};

/**
 * Manually capture an exception
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (import.meta.env.MODE !== "production") {
    console.error("Sentry (dev):", error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Manually capture a message
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: Record<string, any>
) => {
  if (import.meta.env.MODE !== "production") {
    console.log(`Sentry (dev) [${level}]:`, message, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
};

/**
 * Set user context
 */
export const setUserContext = (user: { id: string; email?: string; username?: string } | null) => {
  if (import.meta.env.MODE !== "production") {
    console.log("Sentry (dev): Set user context", user);
    return;
  }

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  if (import.meta.env.MODE !== "production") {
    console.log(`Sentry (dev) breadcrumb [${category}]:`, message, data);
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
};

/**
 * Create a custom span for performance tracking
 * Use this to track important user actions and API calls
 */
export const startSpan = <T>(
  options: { op: string; name: string; attributes?: Record<string, any> },
  callback: (span: any) => T
): T => {
  if (import.meta.env.MODE !== "production") {
    console.log(`Sentry (dev) span [${options.op}]:`, options.name, options.attributes);
    return callback(null);
  }

  return Sentry.startSpan(
    {
      op: options.op,
      name: options.name,
    },
    (span) => {
      // Add custom attributes
      if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
          span?.setAttribute(key, value);
        });
      }
      return callback(span);
    }
  );
};

/**
 * Structured logger using Sentry's logging system
 * Available in production mode when enableLogs is true
 */
export const logger = {
  trace: (message: string, context?: Record<string, any>) => {
    if (import.meta.env.MODE !== "production") {
      console.log(`[TRACE] ${message}`, context);
      return;
    }
    Sentry.logger.trace(message, context);
  },

  debug: (message: string, context?: Record<string, any>) => {
    if (import.meta.env.MODE !== "production") {
      console.log(`[DEBUG] ${message}`, context);
      return;
    }
    Sentry.logger.debug(message, context);
  },

  info: (message: string, context?: Record<string, any>) => {
    if (import.meta.env.MODE !== "production") {
      console.log(`[INFO] ${message}`, context);
      return;
    }
    Sentry.logger.info(message, context);
  },

  warn: (message: string, context?: Record<string, any>) => {
    if (import.meta.env.MODE !== "production") {
      console.warn(`[WARN] ${message}`, context);
      return;
    }
    Sentry.logger.warn(message, context);
  },

  error: (message: string, context?: Record<string, any>) => {
    if (import.meta.env.MODE !== "production") {
      console.error(`[ERROR] ${message}`, context);
      return;
    }
    Sentry.logger.error(message, context);
  },

  fatal: (message: string, context?: Record<string, any>) => {
    if (import.meta.env.MODE !== "production") {
      console.error(`[FATAL] ${message}`, context);
      return;
    }
    Sentry.logger.fatal(message, context);
  },

  /**
   * Template literal function for interpolating variables
   * Usage: logger.fmt`Cache miss for user: ${userId}`
   */
  fmt: (strings: TemplateStringsArray, ...values: any[]) => {
    return strings.reduce((result, str, i) => {
      return result + str + (values[i] !== undefined ? values[i] : '');
    }, '');
  },
};

// Export Sentry for advanced usage
export { Sentry };
