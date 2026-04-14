import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Chrome, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import logo from "@/assets/logo-new.png";

type AuthCardProps = {
  className?: string;
  onSuccess?: () => void;
  redirectOnSuccess?: boolean;
  showStoreLink?: boolean;
};

const getAuthRedirectUrl = () => window.location.origin;

export const AuthCard = ({
  className,
  onSuccess,
  redirectOnSuccess = false,
  showStoreLink = false,
}: AuthCardProps) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let isActive = true;

    const handleSignedIn = (event: string, sessionExists: boolean, provider?: string) => {
      if (!isActive || !sessionExists) {
        return;
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
      handleSignedIn("SIGNED_IN", Boolean(session), session?.user.app_metadata?.provider);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      handleSignedIn(event, Boolean(session), session?.user.app_metadata?.provider);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [navigate, onSuccess, redirectOnSuccess]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);

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
    }

    setIsLoading(false);
  };

  return (
    <Card
      className={cn(
        "w-full max-w-[440px] rounded-none border border-primary/10 bg-background/95 shadow-[0_28px_80px_rgba(77,60,64,0.22)] backdrop-blur-sm",
        className,
      )}
      dir="rtl"
    >
      <CardHeader className="space-y-5 pb-4 text-center">
        <div className="mx-auto bg-[#6B5B5A] px-4 py-3 shadow-sm">
          <img src={logo} alt="יום האם" className="h-16" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-3xl font-normal text-foreground">האיזור האישי</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            התחברי להזמנות, למועדפים ולפרטים האישיים שלך
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-8 pb-8">
        <Button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="h-12 w-full rounded-none bg-[#5E4A50] text-base text-white hover:bg-[#4D3C40] hover:text-white focus:text-white"
        >
          <Chrome className="h-5 w-5" />
          המשיכי עם Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full bg-primary/15" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background px-3 text-muted-foreground">או</span>
          </div>
        </div>

        {magicLinkSent ? (
          <div className="space-y-4 py-2 text-center">
            <Mail className="mx-auto h-10 w-10 text-primary" />
            <p className="text-sm leading-6 text-muted-foreground">
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
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              dir="ltr"
              className="h-12 rounded-none border-primary/15 bg-white text-left"
            />
            <Button
              type="submit"
              variant="outline"
              className="h-12 w-full rounded-none border-primary/20 bg-[#F6F2EF] text-foreground hover:bg-[#EEE7E3] hover:text-foreground"
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? "שולח..." : "שלחי לי קישור"}
            </Button>
          </form>
        )}

        {showStoreLink && (
          <div className="pt-1 text-center">
            <Link
              to={ROUTES.home}
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              חזרה לחנות
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
