import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const SUBSCRIBED_KEY = "newsletter_subscribed";
const POPUP_DELAY_MS = 15000;
const EXIT_INTENT_Y = 24;

const hasSubscribed = () => localStorage.getItem(SUBSCRIBED_KEY) === "true";

export const NewsletterPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // Once dismissed (X / backdrop) we keep it closed for THIS visit only, so the
  // delay timer / exit-intent listener don't immediately reopen it. A fresh page
  // load (next visit) shows it again — it only stops permanently after subscribing.
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (hasSubscribed()) return;

    const open = () => {
      if (!dismissedRef.current) setIsOpen(true);
    };

    const timer = window.setTimeout(open, POPUP_DELAY_MS);

    const handleMouseOut = (event: MouseEvent) => {
      if (window.matchMedia("(pointer: coarse)").matches) return;
      if (event.relatedTarget) return;
      if (event.clientY > EXIT_INTENT_Y) return;
      open();
    };
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);

  const handleDismiss = () => {
    dismissedRef.current = true;
    setIsOpen(false);
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
        toast.success("נרשמת! נשמח לעדכן אותך 💛");
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'generate_lead', { method: 'newsletter_popup' });
        }
      }
      // Subscribed (or already a subscriber) → don't show the popup again.
      localStorage.setItem(SUBSCRIBED_KEY, "true");
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
          <p id="newsletter-popup-title" className="text-3xl md:text-4xl font-bold tracking-wide mb-2">קודם כל את</p>
          <p className="text-lg md:text-xl font-light tracking-wider">שומעת על השקות ומבצעים</p>
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
