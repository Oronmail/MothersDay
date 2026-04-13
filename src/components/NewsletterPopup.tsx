import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const STORAGE_KEY = "newsletter_popup_dismissed";
const POPUP_DELAY = 5000;

export const NewsletterPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => setIsOpen(true), POPUP_DELAY);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, "true");
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
      <div className="relative bg-foreground text-primary-foreground w-full max-w-md p-8 md:p-10 animate-in fade-in zoom-in-95 duration-300">
        <button
          onClick={handleDismiss}
          className="absolute top-4 left-4 text-primary-foreground/60 hover:text-primary-foreground transition-colors"
          aria-label="סגור"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-8">
          <p className="text-3xl md:text-4xl font-bold tracking-wide mb-2">10% הנחה</p>
          <p className="text-lg md:text-xl font-light tracking-wider">הצטרפי למועדון</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם"
              className="w-full bg-transparent border-b border-primary-foreground/30 pb-2 text-sm placeholder:text-primary-foreground/40 focus:outline-none focus:border-primary-foreground/70 transition-colors"
            />
          </div>

          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="אימייל *"
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
