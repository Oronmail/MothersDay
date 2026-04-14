import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import titleUnderline from "@/assets/title-underline.png";
import heartIcon from "@/assets/heart-icon.png";
import smileyIcon from "@/assets/smiley-icon.png";
import clockIcon from "@/assets/clock-icon.png";
import newsletterBorder from "@/assets/newsletter-border.png";

export const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({ email: trimmedEmail });

      if (error) {
        // Check if it's a duplicate email error
        if (error.code === '23505') {
          toast.info("האימייל הזה כבר רשום אצלנו", {
            description: "תודה על ההתעניינות!"
          });
        } else {
          console.error('Newsletter subscription error:', error);
          toast.error("משהו השתבש", {
            description: "נסי שוב מאוחר יותר"
          });
        }
      } else {
        toast.success("תודה על ההרשמה!", {
          description: "נעדכן אותך במבצעים ומוצרים חדשים"
        });
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'generate_lead', { method: 'newsletter_footer' });
        }
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
      <div className="max-w-3xl mx-auto p-6 pb-10 md:p-10 lg:p-12 relative bg-transparent">
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
            <span className="text-2xl md:text-3xl lg:text-4xl font-normal text-foreground">רוצה</span>
            <img src={smileyIcon} alt="" className="w-5 h-5 md:w-7 md:h-7" />
            <span className="text-2xl md:text-3xl lg:text-4xl font-normal text-foreground">מתכננת</span>
            <img src={clockIcon} alt="" className="w-5 h-5 md:w-7 md:h-7" />
            <span className="text-2xl md:text-3xl lg:text-4xl font-normal text-foreground">עושה</span>
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
          <p className="text-lg md:text-base text-foreground">
            הבלוג של יום האם
          </p>
          <p className="text-lg md:text-base text-foreground">
            לתכנון וניהול זמן לאימהות
          </p>
          <p className="text-lg md:text-base text-foreground">
            הירשמי לניוזלטר ותהני גם מפעילויות שוות
          </p>
        </div>

        {/* Email form */}
        <form onSubmit={handleSubscribe} className="flex flex-row gap-3 max-w-md mx-auto justify-center relative z-10">
          <Input
            type="email"
            placeholder="הכניסי את האימייל שלך"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-48 md:w-64 text-right bg-[#A89A9A] text-white placeholder:text-white/70 border-0 h-9 md:h-10 text-base md:text-sm"
            dir="rtl"
            maxLength={255}
          />
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="whitespace-nowrap bg-[#4A4A4A] hover:bg-[#3A3A3A] hover:text-white focus:text-white text-white text-base md:text-sm px-4 md:px-6 h-9 md:h-10 border-0"
          >
            {isLoading ? "שולח..." : "הרשמה"}
          </Button>
        </form>
      </div>
    </div>
  );
};
