import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Chrome, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { MarketingConsentText } from "@/components/MarketingConsentText";
import { supabase } from "@/lib/supabase";
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

const getAuthRedirectUrl = () => window.location.origin;

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
  const [pendingOptInEmail, setPendingOptInEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isActive = true;

    const handleSignedIn = (
      event: string,
      sessionExists: boolean,
      provider?: string,
      sessionEmail?: string,
    ) => {
      if (!isActive || !sessionExists) {
        return;
      }

      // Google sends her away and back, so the opt-in travels in sessionStorage.
      if (sessionEmail && sessionStorage.getItem(NEWSLETTER_OPT_IN_KEY) === "1") {
        sessionStorage.removeItem(NEWSLETTER_OPT_IN_KEY);
        setPendingOptInEmail(sessionEmail);
      }

      if (typeof window.gtag === "function") {
        const method = provider === "google" ? "google" : "magic_link";
        window.gtag("event", event === "SIGNED_IN" ? "login" : "sign_up", { method });
      }

      onSuccess?.();

      if (redirectOnSuccess) {
        navigate(ROUTES.home, { replace: true });
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSignedIn(
        "SIGNED_IN",
        Boolean(session),
        session?.user.app_metadata?.provider,
        session?.user.email,
      );
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      handleSignedIn(
        event,
        Boolean(session),
        session?.user.app_metadata?.provider,
        session?.user.email,
      );
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [navigate, onSuccess, redirectOnSuccess]);

  // Runs outside onAuthStateChange, so the Supabase call here is safe.
  useEffect(() => {
    if (!pendingOptInEmail) return;
    subscribeToNewsletter(pendingOptInEmail);
    setPendingOptInEmail(null);
  }, [pendingOptInEmail]);

  /**
   * Records the marketing opt-in. A duplicate address (23505) just means she is
   * already subscribed, which is not an error worth surfacing during login.
   */
  const subscribeToNewsletter = async (address: string) => {
    const trimmed = address.trim().toLowerCase();
    if (!trimmed) return;

    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: trimmed });

    if (error && error.code !== "23505") {
      console.error("Newsletter subscription error:", error);
      return;
    }

    if (typeof window.gtag === "function") {
      window.gtag("event", "generate_lead", { method: "newsletter_auth" });
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
          redirectTo: getAuthRedirectUrl(),
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
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });

    if (error) {
      toast.error("שגיאה בשליחת הקישור");
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
          <Chrome className="h-4 w-4" />
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
            <Input
              type="email"
              placeholder="דואר אלקטרוני *"
              aria-label="דואר אלקטרוני"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              dir="rtl"
              className="rounded-none bg-background text-right"
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
