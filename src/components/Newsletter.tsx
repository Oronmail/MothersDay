import { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { subscribeToNewsletter } from "@/lib/api";
import titleUnderline from "@/assets/title-underline.png";
import heartIcon from "@/assets/heart-icon.png";
import smileyIcon from "@/assets/smiley-icon.png";
import clockIcon from "@/assets/clock-icon.png";
import newsletterBorder from "@/assets/newsletter-border.png";

const showAlreadyToast = () =>
  toast.info("האימייל הזה כבר רשום אצלנו", {
    description: "תודה על ההתעניינות!",
  });

const showSubscribedToast = (emailSent: boolean) =>
  toast.success("תודה על ההרשמה!", {
    description: emailSent ? (
      <span className="flex items-center gap-1">
        שלחנו לך למייל קוד הנחה להזמנה הראשונה
        <img src={smileyIcon} alt="" className="h-4 w-4" />
      </span>
    ) : (
      "נעדכן אותך במבצעים ומוצרים חדשים"
    ),
  });

export const Newsletter = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // DEV: open any page with ?toast_already or ?toast_success to review the
  // signup toasts without subscribing.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("toast_already")) showAlreadyToast();
    if (params.has("toast_success")) showSubscribedToast(true);
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedEmail = email.trim().toLowerCase();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      toast.error("נא להזין כתובת אימייל תקינה");
      return;
    }

    if (trimmedEmail.length > 255) {
      toast.error("כתובת האימייל ארוכה מדי");
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await subscribeToNewsletter({
        email: trimmedEmail,
        name: name.trim() || undefined,
        source: 'newsletter_footer',
      });

      if (result.already) {
        showAlreadyToast();
      } else {
        showSubscribedToast(result.emailSent);
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'generate_lead', { method: 'newsletter_footer' });
        }
        setName("");
        setEmail("");
      }
    } catch (err) {
      console.error('Newsletter subscription error:', err);
      toast.error("משהו השתבש", {
        description: "נסי שוב מאוחר יותר"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-12 md:py-16 px-4 md:px-8 mb-0 md:mb-3" dir="rtl">
      <div className="max-w-3xl mx-auto p-6 pb-14 md:p-10 md:pb-16 lg:p-12 lg:pb-20 relative bg-transparent">
        {/* Sketch border as background image */}
        <img 
          src={newsletterBorder} 
          alt="" 
          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
          style={{ objectFit: 'fill' }}
        />
        {/* Title with icons and underline */}
        <div className="flex flex-col items-center mb-4 md:mb-6 relative z-10">
          <div className="flex items-center gap-1.5 md:gap-3 mb-1">
            <img src={heartIcon} alt="" className="w-5 h-5 md:w-7 md:h-7" />
            <span className="font-display text-2xl md:text-3xl lg:text-4xl font-normal text-foreground">רוצה</span>
            <img src={smileyIcon} alt="" className="w-5 h-5 md:w-7 md:h-7" />
            <span className="font-display text-2xl md:text-3xl lg:text-4xl font-normal text-foreground">מתכננת</span>
            <img src={clockIcon} alt="" className="w-5 h-5 md:w-7 md:h-7" />
            <span className="font-display text-2xl md:text-3xl lg:text-4xl font-normal text-foreground">עושה</span>
            <img src={heartIcon} alt="" className="w-5 h-5 md:w-7 md:h-7" />
          </div>
          <img 
            src={titleUnderline} 
            alt="" 
            className="w-32 md:w-56"
          />
        </div>

        {/* Description text */}
        <div className="text-center space-y-0.5 md:space-y-1 mb-5 md:mb-6 relative z-10">
          <p className="text-sm md:text-base text-foreground">
            הצטרפי למועדון "רוצה מתכננת עושה"
          </p>
          <p className="text-sm md:text-base text-foreground">
            תהני מהבלוג שלנו על תכנון וניהול זמן לאימהות,
          </p>
          <p className="text-sm md:text-base text-foreground">
            תהיי הראשונה לשמוע על השקות ומבצעים,
          </p>
          <p className="text-sm md:text-base text-foreground pt-1">
            ומתנת הצטרפות:
          </p>
          <p className="font-display text-2xl md:text-3xl font-bold text-foreground leading-none">
            10% הנחה על ההזמנה הראשונה
          </p>
          <p className="text-[11px] text-foreground/50">*לא כולל מארזים</p>
        </div>

        {/* Email form */}
        <form onSubmit={handleSubscribe} className="flex flex-row flex-wrap gap-3 max-w-lg mx-auto justify-center relative z-10">
          <Input
            type="text"
            placeholder="שם"
            aria-label="שם"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-28 md:w-36 text-right bg-[#a998a2] text-white placeholder:text-white/75 border-0 rounded-none h-9 md:h-10 text-base md:text-sm"
            dir="rtl"
            maxLength={120}
          />
          <Input
            type="email"
            placeholder="דואר אלקטרוני"
            aria-label="דואר אלקטרוני"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-48 md:w-56 text-right bg-[#a998a2] text-white placeholder:text-white/75 border-0 rounded-none h-9 md:h-10 text-base md:text-sm"
            dir="rtl"
            maxLength={255}
          />
          <Button
            type="submit"
            disabled={isLoading}
            className="whitespace-nowrap bg-primary hover:bg-primary/90 text-primary-foreground rounded-none text-base md:text-sm px-5 md:px-7 h-9 md:h-10 border-0"
          >
            {isLoading ? "שולח..." : "הצטרפות"}
          </Button>
        </form>
      </div>
    </div>
  );
};
