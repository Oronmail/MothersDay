import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import type { AuthError, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { MarketingConsentText } from "@/components/MarketingConsentText";
import { supabase } from "@/lib/supabase";
import { subscribeToNewsletter as apiSubscribeToNewsletter } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import smileyIcon from "@/assets/smiley-icon.png";
import titleUnderline from "@/assets/title-underline.png";

type AuthCardProps = {
  className?: string;
  onSuccess?: () => void;
  redirectOnSuccess?: boolean;
  showStoreLink?: boolean;
};

/**
 * Where to send her after login, from `?next=` (e.g. /auth?next=/checkout).
 * Only same-origin absolute paths are honored — a single leading slash, no
 * protocol-relative "//host" and no backslash tricks — so the param can never
 * become an open redirect.
 */
const getSafeNextPath = (raw: string | null): string | null => {
  if (!raw || !raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.includes("\\")) return null;
  return raw;
};

/**
 * OAuth and magic-link emails return to this URL. With a safe `next` path she
 * lands straight on it (the Supabase client picks the session out of the URL
 * on any page); otherwise the homepage, as before.
 */
const getAuthRedirectUrl = (nextPath: string | null) =>
  nextPath ? `${window.location.origin}${nextPath}` : window.location.origin;

/** Hebrew message for a failed magic-link request, mapped from the Supabase error. */
const getMagicLinkErrorMessage = (error: AuthError): string => {
  const message = error.message?.toLowerCase() ?? "";
  if (
    error.status === 429 ||
    error.code === "over_email_send_rate_limit" ||
    error.code === "over_request_rate_limit" ||
    message.includes("rate limit") ||
    message.includes("you can only request this after")
  ) {
    return "יותר מדי ניסיונות — נסי שוב בעוד כמה דקות";
  }
  if (
    error.code === "email_address_invalid" ||
    error.code === "validation_failed" ||
    (message.includes("invalid") && message.includes("email"))
  ) {
    return "כתובת המייל לא תקינה — בדקי אותה ונסי שוב";
  }
  return "שגיאה בשליחת הקישור";
};

/** Monochrome Google "G" mark — lucide has no Google logo (Chrome is a browser icon). */
const GoogleGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
  </svg>
);

/** Survives the Google OAuth round trip, which unmounts this component. */
const NEWSLETTER_OPT_IN_KEY = "auth-newsletter-opt-in";

export const AuthCard = ({
  className,
  onSuccess,
  redirectOnSuccess = false,
  showStoreLink = false,
}: AuthCardProps) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  // Marketing consent must be an active opt-in, so this starts unchecked.
  const [joinNewsletter, setJoinNewsletter] = useState(false);
  // Set when a Google sign-in returns and an opt-in was pending. Never subscribe
  // from inside onAuthStateChange — querying Supabase there freezes auth.
  const [pendingOptIn, setPendingOptIn] = useState<{ email: string; name?: string } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  // /auth?next=/checkout → back to checkout after login. null unless safe.
  const nextPath = getSafeNextPath(new URLSearchParams(location.search).get("next"));

  useEffect(() => {
    let isActive = true;
    // Session presence before the current event. Distinguishes a genuine
    // sign-in from a session merely restored on load (or re-emitted by
    // Supabase on tab refocus / token refresh). null = not yet known.
    let hadSession: boolean | null = null;

    const completeSignIn = (session: Session, isFreshSignIn: boolean) => {
      if (!isActive) {
        return;
      }

      // Google sends her away and back, so the opt-in travels in sessionStorage.
      const sessionEmail = session.user.email;
      if (sessionEmail && sessionStorage.getItem(NEWSLETTER_OPT_IN_KEY) === "1") {
        sessionStorage.removeItem(NEWSLETTER_OPT_IN_KEY);
        // Google gives us her name — the welcome email greets her personally.
        const fullName =
          typeof session.user.user_metadata?.full_name === "string"
            ? session.user.user_metadata.full_name
            : undefined;
        setPendingOptIn({ email: sessionEmail, name: fullName });
      }

      // GA "login" only for a real sign-in transition, never for a session
      // restored from storage — and never a fabricated "sign_up": with magic
      // links there is no reliable first-sign-up signal to report.
      if (isFreshSignIn && typeof window.gtag === "function") {
        const provider = session.user.app_metadata?.provider;
        window.gtag("event", "login", {
          method: provider === "google" ? "google" : "magic_link",
        });
      }

      onSuccess?.();

      if (redirectOnSuccess) {
        navigate(nextPath ?? ROUTES.home, { replace: true });
      }
    };

    // Already signed in when the card opens (e.g. visiting /auth with a live
    // session): close/redirect as before, but do not count it as a login.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isActive) {
        return;
      }
      if (hadSession === null) {
        hadSession = Boolean(session);
      }
      if (session) {
        completeSignIn(session, false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isActive) {
        return;
      }
      if (event === "SIGNED_OUT") {
        hadSession = false;
        return;
      }
      if (event === "INITIAL_SESSION") {
        // Restored (or absent) session on load — the getSession() call above
        // already handles the already-signed-in case.
        if (hadSession === null) {
          hadSession = Boolean(session);
        }
        return;
      }
      if (event === "SIGNED_IN" && session) {
        const isFreshSignIn = hadSession !== true;
        hadSession = true;
        completeSignIn(session, isFreshSignIn);
      }
      // TOKEN_REFRESHED / USER_UPDATED are not sign-ins — nothing to do.
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [navigate, nextPath, onSuccess, redirectOnSuccess]);

  // Runs outside onAuthStateChange, so the Supabase call here is safe.
  useEffect(() => {
    if (!pendingOptIn) return;
    subscribeToNewsletter(pendingOptIn.email, pendingOptIn.name);
    setPendingOptIn(null);
  }, [pendingOptIn]);

  /**
   * Records the marketing opt-in through the shared server flow, so she gets
   * the same welcome email (WELCOME10) as popup/footer signups. An address
   * that is already subscribed is absorbed there — not an error worth
   * surfacing during login.
   */
  const subscribeToNewsletter = async (address: string, name?: string) => {
    const trimmed = address.trim().toLowerCase();
    if (!trimmed) return;

    try {
      const result = await apiSubscribeToNewsletter({
        email: trimmed,
        name,
        source: "auth_card",
      });
      if (!result.already && typeof window.gtag === "function") {
        window.gtag("event", "generate_lead", { method: "newsletter_auth" });
      }
    } catch (error) {
      console.error("Newsletter subscription error:", error);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);

    if (joinNewsletter) {
      sessionStorage.setItem(NEWSLETTER_OPT_IN_KEY, "1");
    } else {
      sessionStorage.removeItem(NEWSLETTER_OPT_IN_KEY);
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthRedirectUrl(nextPath),
        },
      });

      if (error) {
        toast.error("שגיאה בהתחברות עם Google");
      }
    } catch {
      toast.error("שגיאה בהתחברות עם Google");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getAuthRedirectUrl(nextPath),
      },
    });

    if (error) {
      toast.error(getMagicLinkErrorMessage(error));
    } else {
      toast.success("קישור התחברות נשלח למייל שלך");
      setMagicLinkSent(true);
      if (joinNewsletter) {
        await subscribeToNewsletter(email);
      }
    }

    setIsLoading(false);
  };

  return (
    <div
      className={cn(
        "w-full max-w-sm border border-border bg-background p-6 shadow-xl md:p-8",
        className,
      )}
      dir="rtl"
    >
      {/* Header — same rhythm as the 10% card: brand mark, display title, underline */}
      <div className="mb-6 text-center">
        <img src={smileyIcon} alt="" className="mx-auto mb-2 h-9 w-9" />
        <p className="font-display text-4xl font-bold leading-none text-foreground">
          האזור האישי
        </p>
        <img src={titleUnderline} alt="" className="mx-auto mt-1 w-36" />
        <p className="mt-2 text-sm text-foreground/70">
          ההזמנות שלך, המועדפים והפרטים ששמרת
        </p>
      </div>

      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="h-11 w-full rounded-none border-border bg-background text-sm text-foreground hover:bg-secondary/40 hover:text-foreground"
        >
          <GoogleGlyph className="h-4 w-4" />
          המשיכי עם Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full bg-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-3 text-foreground/50">או</span>
          </div>
        </div>

        {magicLinkSent ? (
          <div className="space-y-3 py-2 text-center">
            <Mail className="mx-auto h-9 w-9 text-primary" />
            <p className="text-sm leading-6 text-foreground/70">
              שלחנו קישור התחברות ל-<strong dir="ltr">{email}</strong>
            </p>
            <Button
              type="button"
              variant="ghost"
              className="text-sm hover:text-primary"
              onClick={() => {
                setMagicLinkSent(false);
                setEmail("");
              }}
            >
              שליחה חוזרת
            </Button>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-3">
            {/* Email addresses are LTR even inside the RTL form; the Hebrew
                placeholder stays right-aligned so the empty field still reads RTL. */}
            <Input
              type="email"
              placeholder="דואר אלקטרוני *"
              aria-label="דואר אלקטרוני"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              dir="ltr"
              className="rounded-none bg-background text-left placeholder:text-right"
            />

            {/* Optional marketing opt-in. Unticked by default: under Israeli
                anti-spam law a pre-ticked box is not valid consent. */}
            <label className="flex items-start gap-2 text-right text-[11px] leading-snug text-foreground/60">
              <input
                type="checkbox"
                checked={joinNewsletter}
                onChange={(e) => setJoinNewsletter(e.target.checked)}
                disabled={isLoading}
                className="mt-0.5 shrink-0 accent-primary"
              />
              <MarketingConsentText />
            </label>

            <Button
              type="submit"
              className="w-full rounded-none bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? "שולח..." : "לקבלת קישור"}
            </Button>
          </form>
        )}

        {showStoreLink && (
          <div className="pt-1 text-center">
            <Link
              to={ROUTES.home}
              className="text-sm text-foreground/60 transition-colors hover:text-primary"
            >
              חזרה לחנות
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
