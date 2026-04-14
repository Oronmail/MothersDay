import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const STORAGE_KEY = "newsletter_popup_dismissed_at";
const POPUP_DELAY_MS = 15000;
const DISMISS_DURATION_MS = 1000 * 60 * 60 * 24 * 14;
const SCROLL_THRESHOLD = 0.35;
const EXIT_INTENT_Y = 24;

const wasDismissedRecently = () => {
  const storedValue = localStorage.getItem(STORAGE_KEY);
  if (!storedValue) return false;

  const dismissedAt = Number(storedValue);
  if (!Number.isFinite(dismissedAt)) return false;

  return Date.now() - dismissedAt < DISMISS_DURATION_MS;
};

export const NewsletterPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEligibleToOpen, setIsEligibleToOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (wasDismissedRecently()) return;

    const timer = window.setTimeout(() => setIsEligibleToOpen(true), POPUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isEligibleToOpen || isOpen) return;

    const openPopup = () => setIsOpen(true);
    const hasScrollablePage =
      document.documentElement.scrollHeight > window.innerHeight + 120;

    const maybeOpenFromScroll = () => {
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress =
        scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;

      if (scrollProgress >= SCROLL_THRESHOLD) {
        openPopup();
      }
    };

    const handleMouseOut = (event: MouseEvent) => {
      if (window.matchMedia("(pointer: coarse)").matches) return;
      if (event.relatedTarget) return;
      if (event.clientY > EXIT_INTENT_Y) return;
      openPopup();
    };

    if (!hasScrollablePage) {
      openPopup();
      return;
    }

    maybeOpenFromScroll();
    window.addEventListener("scroll", maybeOpenFromScroll, { passive: true });
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      window.removeEventListener("scroll", maybeOpenFromScroll);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, [isEligibleToOpen, isOpen]);

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: email.trim(), name: name.trim() || null, phone: phone.trim() || null });

      if (error) {
        if (error.code === "23505") {
          toast.success("כבר נרשמת! תודה 💛");
        } else {
          throw error;
        }
      } else {
        toast.success("נרשמת בהצלחה! קוד ההנחה בדרך אלייך 💛");
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'generate_lead', { method: 'newsletter_popup' });
        }
      }
      handleDismiss();
    } catch {
      toast.error("משהו השתבש, נסי שוב");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Modal */}
      <div
        className="relative bg-foreground text-primary-foreground w-full max-w-md p-8 md:p-10 animate-in fade-in zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-popup-title"
      >
        <button
          onClick={handleDismiss}
          className="absolute top-4 left-4 text-primary-foreground/60 hover:text-primary-foreground transition-colors"
          aria-label="סגור"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-8">
          <p id="newsletter-popup-title" className="text-3xl md:text-4xl font-bold tracking-wide mb-2">10% הנחה</p>
          <p className="text-lg md:text-xl font-light tracking-wider">הצטרפי למועדון</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם"
              aria-label="שם"
              className="w-full bg-transparent border-b border-primary-foreground/30 pb-2 text-sm placeholder:text-primary-foreground/40 focus:outline-none focus:border-primary-foreground/70 transition-colors"
            />
          </div>

          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="אימייל *"
              aria-label="אימייל"
              required
              className="w-full bg-transparent border-b border-primary-foreground/30 pb-2 text-sm placeholder:text-primary-foreground/40 focus:outline-none focus:border-primary-foreground/70 transition-colors"
            />
          </div>

          <div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="טלפון"
              aria-label="טלפון"
              dir="rtl"
              className="w-full bg-transparent border-b border-primary-foreground/30 pb-2 text-sm text-right placeholder:text-primary-foreground/40 focus:outline-none focus:border-primary-foreground/70 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary-foreground text-foreground py-3 text-sm font-medium tracking-wider hover:bg-primary-foreground/90 transition-colors disabled:opacity-50 mt-3"
          >
            {isSubmitting ? "שולח..." : "הרשמה"}
          </button>
        </form>
      </div>
    </div>
  );
};
