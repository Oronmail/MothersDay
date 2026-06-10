import { useState } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ROUTES } from "@/lib/routes";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import heartIcon from "@/assets/heart-icon.png";
import titleUnderline from "@/assets/title-underline.png";

/**
 * Newsletter signup card that rises over the hero (see Hero.tsx).
 * Brand character: a hand-drawn heart emblem on top + the sketch underline.
 */
export const HeroNewsletterCard = ({ onDismiss }: { onDismiss: () => void }) => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: trimmedEmail, phone: phone.trim() || null });

      if (error && error.code !== "23505") throw error;

      if (error?.code === "23505") {
        toast.success("כבר נרשמת! תודה 💛");
      } else {
        toast.success("נרשמת בהצלחה! קוד ההנחה בדרך אלייך 💛");
        if (typeof window.gtag === "function") {
          window.gtag("event", "generate_lead", { method: "hero_newsletter" });
        }
      }
      onDismiss();
    } catch {
      toast.error("משהו השתבש, נסי שוב");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
      dir="rtl"
    >
      {/* Scrim — the hero video keeps playing behind it */}
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]"
        onClick={onDismiss}
      />

      {/* Card */}
      <div className="relative w-full max-w-sm bg-background border border-border shadow-xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="סגור"
          className="absolute top-3 left-3 z-20 text-foreground/40 hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <img src={heartIcon} alt="" className="w-9 h-9 mx-auto mb-2" />
          <p className="text-sm text-foreground/70 mb-1">הירשמי עכשיו ותקבלי</p>
          <p className="font-display text-4xl font-bold text-foreground leading-none">10% הנחה</p>
          <img src={titleUnderline} alt="" className="w-36 mx-auto mt-1" />
          <p className="text-sm text-foreground/70 mt-2">על ההזמנה הראשונה מהאתר!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
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
            <span>
              בהצטרפות לרשימה את מסכימה שנשתמש במידע שלך לצורך פניות שיווקיות, בהתאם{" "}
              <Link to={ROUTES.privacy} className="underline hover:text-foreground">
                למדיניות הפרטיות
              </Link>{" "}
              שלנו. ניתן להסיר בכל עת.
            </span>
          </label>

          <Button
            type="submit"
            disabled={isSubmitting || !consent}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSubmitting ? "שולח..." : "לקבלת ההטבה"}
          </Button>
        </form>
      </div>
    </div>
  );
};
