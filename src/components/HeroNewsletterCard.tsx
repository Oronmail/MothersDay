import { useState, useEffect } from "react";
import { Copy, X } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { MarketingConsentText } from "@/components/MarketingConsentText";
import { subscribeToNewsletter } from "@/lib/api";
import { WELCOME_COUPON } from "@/lib/siteConfig";
import heartIcon from "@/assets/heart-icon.png";
import smileyIcon from "@/assets/smiley-icon.png";
import titleUnderline from "@/assets/title-underline.png";

// This card owns its own visibility so it can't be affected by edits to Hero.tsx.
// Subscribed → never shown again (localStorage). Dismissed with X → hidden for the
// rest of THIS visit only (sessionStorage); the next visit shows it again.
const SUBSCRIBED_KEY = "hero_newsletter_subscribed";
const SESSION_DISMISS_KEY = "hero_newsletter_dismissed";
// PROD desktop: rise over the hero a few seconds in, tuned to the loop.
const NEWSLETTER_DELAY_MS = 11000;
// Mobile: rise right after the drawer opens (~4s into the clip).
const MOBILE_DELAY_MS = 4000;
// DEV desktop: appear right after load, on every reload.
const DEV_DELAY_MS = 500;

/**
 * The 10% newsletter signup card, mounted in the store layout (SiteAccess) so
 * it rises on any page a visitor lands on — except checkout.
 * Self-managing: decides on its own when to appear and hide.
 * Brand character: a hand-drawn heart emblem on top + the sketch underline.
 */
export const HeroNewsletterCard = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // After a successful signup the card flips to showing the welcome code.
  // DEV: open /?welcome_preview to review the post-signup code view without subscribing.
  const [welcomeEmailSent, setWelcomeEmailSent] = useState<boolean | null>(
    import.meta.env.DEV && new URLSearchParams(window.location.search).has("welcome_preview")
      ? true
      : null,
  );
  const isMobile = useIsMobile();

  // PROD: shows every visit (desktop after 11s, mobile after ~4s) unless she already
  // subscribed; an X-dismiss only holds for the current visit (sessionStorage).
  // DEV desktop: show right after load on every reload so it can be reviewed;
  // closing with X keeps it hidden until the next reload.
  useEffect(() => {
    const isDev = import.meta.env.DEV;
    if (!isDev) {
      if (localStorage.getItem(SUBSCRIBED_KEY) === "true") return;
      if (sessionStorage.getItem(SESSION_DISMISS_KEY) === "true") return;
    }
    const delay = isMobile ? MOBILE_DELAY_MS : isDev ? DEV_DELAY_MS : NEWSLETTER_DELAY_MS;
    const timer = window.setTimeout(() => {
      // Never interrupt a purchase — if she reached checkout this fast,
      // skip quietly (next visit shows the card again).
      if (window.location.pathname.startsWith("/checkout")) return;
      setIsOpen(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [isMobile]);

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem(SESSION_DISMISS_KEY, "true");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("נא להזין כתובת אימייל תקינה");
      return;
    }
    if (!consent) return;

    setIsSubmitting(true);
    try {
      const result = await subscribeToNewsletter({
        email: trimmedEmail,
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        source: "hero_popup",
      });

      if (result.already) {
        toast.success(
          <span className="flex items-center gap-1">
            כבר נרשמת! תודה
            <img src={smileyIcon} alt="" className="h-4 w-4" />
          </span>
        );
      } else if (typeof window.gtag === "function") {
        window.gtag("event", "generate_lead", { method: "hero_newsletter" });
      }

      // Flip to the code view (don't close) — and never show the card again.
      setWelcomeEmailSent(result.emailSent);
      localStorage.setItem(SUBSCRIBED_KEY, "true");
    } catch {
      toast.error("משהו השתבש, נסי שוב");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(WELCOME_COUPON.code);
      toast.success("הקוד הועתק 💛");
    } catch {
      // Clipboard unavailable — the code is on screen anyway.
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
      dir="rtl"
    >
      {/* Scrim — the hero video keeps playing behind it */}
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]"
        onClick={handleDismiss}
      />

      {/* Card */}
      <div className="relative w-full max-w-sm bg-background border border-border shadow-xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="סגור"
          className="absolute top-3 left-3 z-20 text-foreground/40 hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {welcomeEmailSent !== null ? (
          /* Success: the promise is kept on the spot — the code is right here. */
          <div className="text-center">
            <img src={heartIcon} alt="" className="w-9 h-9 mx-auto mb-2" />
            <p className="text-sm text-foreground/70 mb-1">נרשמת בהצלחה!</p>
            <p className="font-display text-4xl font-bold text-foreground leading-none">הקוד שלך כאן</p>
            <img src={titleUnderline} alt="" className="w-36 mx-auto mt-1" />

            <button
              type="button"
              onClick={copyCode}
              className="mt-5 w-full border-[1.5px] border-dashed border-primary bg-secondary/40 py-4 px-3 flex items-center justify-center gap-2 hover:bg-secondary/70 transition-colors"
              aria-label={`העתיקי את הקוד ${WELCOME_COUPON.code}`}
            >
              <span className="font-mono text-2xl font-bold tracking-[0.25em] text-primary" dir="ltr">
                {WELCOME_COUPON.code}
              </span>
              <Copy className="h-4 w-4 text-foreground/50 shrink-0" />
            </button>

            <p className="text-sm text-foreground/70 mt-3">
              {WELCOME_COUPON.percent}% הנחה על ההזמנה הראשונה
            </p>
            <p className="text-[11px] text-foreground/50 mt-1">
              *לא כולל מארזים · מזינים את הקוד בעמוד התשלום
            </p>
            {welcomeEmailSent && (
              <p className="text-xs text-foreground/60 mt-2 flex items-center justify-center gap-1.5">
                שלחנו לך את הקוד גם למייל
                <img src={smileyIcon} alt="" className="h-4 w-4" />
              </p>
            )}

            <Button
              type="button"
              onClick={handleDismiss}
              className="w-full mt-5 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              לקנייה
            </Button>
          </div>
        ) : (
          <>
        <div className="text-center mb-6">
          <img src={heartIcon} alt="" className="w-9 h-9 mx-auto mb-2" />
          <p className="text-sm text-foreground/70 mb-1">הירשמי עכשיו ותקבלי</p>
          <p className="font-display text-4xl font-bold text-foreground leading-none">10% הנחה</p>
          <img src={titleUnderline} alt="" className="w-36 mx-auto mt-1" />
          <p className="text-sm text-foreground/70 mt-2">על ההזמנה הראשונה מהאתר!</p>
          <p className="text-[11px] text-foreground/50 mt-1">*לא כולל מארזים</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="שם"
            aria-label="שם"
            className="text-right bg-background"
            dir="rtl"
          />
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="דואר אלקטרוני *"
            aria-label="דואר אלקטרוני"
            className="text-right bg-background"
            dir="rtl"
          />
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="טלפון נייד"
            aria-label="טלפון נייד"
            className="text-right bg-background"
            dir="rtl"
          />

          <label className="flex items-start gap-2 text-[11px] leading-snug text-foreground/60 text-right">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              className="mt-0.5 shrink-0 accent-primary"
            />
            <MarketingConsentText />
          </label>

          <Button
            type="submit"
            disabled={isSubmitting || !consent}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSubmitting ? "שולח..." : "לקבלת ההטבה"}
          </Button>
        </form>
          </>
        )}
      </div>
    </div>
  );
};
