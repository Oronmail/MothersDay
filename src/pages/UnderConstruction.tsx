import { useNavigate } from "react-router-dom";
import { Lock, Mail } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import logo from "@/assets/logo-new.png";
import underConstructionBg from "@/assets/under-construction-bg.png";
const emailSchema = z.object({
  email: z.string().trim().email({
    message: "כתובת אימייל לא תקינה"
  }).max(255)
});
const UnderConstruction = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "mt") {
      sessionStorage.setItem("site_authenticated", "true");
      setIsPasswordDialogOpen(false);
      navigate("/site");
    } else {
      toast({
        title: "סיסמה שגויה",
        description: "אנא נסי שוב",
        variant: "destructive"
      });
      setPassword("");
    }
  };
  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validatedData = emailSchema.parse({
        email
      });
      setIsSubmitting(true);
      const {
        error
      } = await supabase.from("newsletter_subscribers").insert({
        email: validatedData.email
      });
      if (error) {
        if (error.code === "23505") {
          toast({
            title: "כבר רשום!",
            description: "האימייל הזה כבר רשום לרשימת התפוצה שלנו",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "תודה על ההרשמה! 💝",
          description: "נעדכן אותך ברגע שהאתר יהיה מוכן"
        });
        setEmail("");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "שגיאה",
          description: error.errors[0].message,
          variant: "destructive"
        });
      } else {
        console.error("Newsletter signup error:", error);
        toast({
          title: "שגיאה",
          description: "משהו השתבש. אנא נסו שוב מאוחר יותר",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className="h-screen relative overflow-hidden" style={{
    backgroundImage: `url(${underConstructionBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  }}>
      {/* Small login button in top left */}
      <button onClick={() => setIsPasswordDialogOpen(true)} className="absolute top-6 left-6 flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors z-10 bg-background/80 backdrop-blur-sm px-3 py-2 shadow-sm">
        <Lock className="w-4 h-4" />
        <span>כניסה לאתר</span>
      </button>

      {/* Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">כניסה לאתר</DialogTitle>
            <DialogDescription className="text-center">
              האתר נמצא בבדיקות. אנא הזיני סיסמה כדי להמשיך.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <Input type="password" placeholder="הזיני סיסמה" value={password} onChange={e => setPassword(e.target.value)} className="text-center" autoFocus />
            </div>
            <Button type="submit" className="w-full">
              כניסה
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Main content */}
      <div className="relative h-full flex flex-col items-center justify-center p-4 md:p-6">
        <div className="max-w-2xl w-full text-center space-y-3 md:space-y-4 bg-background/90 backdrop-blur-sm p-4 md:p-6 shadow-xl font-sans">
          {/* Logo */}
          <div className="flex justify-center mb-2">
            <div className="relative">
              <img src={logo} alt="יום האם" className="h-16 md:h-20 w-auto object-contain relative z-10" />
              <div className="absolute inset-0 bg-primary/5 blur-2xl" />
            </div>
          </div>

          {/* Main heading */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl text-primary font-normal">האתר עולה בקרוב</h1>
            <div className="flex items-center justify-center gap-2">
              <div className="h-0.5 w-16 bg-gradient-to-r from-transparent to-primary/40" />
              <div className="h-0.5 w-16 bg-gradient-to-l from-transparent to-primary/40" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 text-base md:text-lg" dir="rtl">
            <p className="leading-relaxed text-foreground font-medium">אנחנו משלימים בימים אלו את חוויית הקנייה החדשה של “יום האם”, 
 מותג מוצרי נייר לאימהות לתכנון, ניהול וארגון הזמן בחיי המשפחה. </p>
            <p className="text-sm md:text-base text-muted-foreground">כבר ממש בקרוב תוכלי ליהנות מחוויית משתמש נוחה, 
מהמוצרים החדשים ומהמארזים המיוחדים.</p>
            
          </div>

          {/* Newsletter Signup Form */}
          <div className="pt-2" dir="rtl">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 blur-xl" />
              <div className="relative bg-background/50 backdrop-blur-sm border-2 border-primary/20 p-3 md:p-4 space-y-2">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Mail className="w-4 h-4" />
                  <h3 className="text-base md:text-lg">הירשמי לעדכונים</h3>
                  <Mail className="w-4 h-4" />
                </div>
                <p className="text-xs md:text-sm text-muted-foreground text-center">רוצה להיות הראשונה לדעת כשהאתר נפתח?</p>
                <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
                  <Input type="email" placeholder="האימייל שלך..." value={email} onChange={e => setEmail(e.target.value)} className="flex-1 text-center sm:text-right bg-background border-primary/30 focus:border-primary" dir="rtl" disabled={isSubmitting} />
                  <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
                    {isSubmitting ? "שולח..." : "הרשמה"}
                  </Button>
                </form>
              </div>
            </div>
          </div>

          {/* Animated dots */}
          <div className="flex justify-center gap-2 pt-2">
            <div className="w-2 h-2 bg-primary animate-bounce" style={{
            animationDelay: "0s"
          }} />
            <div className="w-2 h-2 bg-secondary animate-bounce" style={{
            animationDelay: "0.2s"
          }} />
            <div className="w-2 h-2 bg-primary animate-bounce" style={{
            animationDelay: "0.4s"
          }} />
          </div>
        </div>
      </div>
    </div>;
};
export default UnderConstruction;