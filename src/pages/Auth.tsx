import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ROUTES } from "@/lib/routes";
import { Chrome, Mail } from "lucide-react";
import headerTexture from "@/assets/header-texture.png";
import logo from "@/assets/logo-new.png";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate(ROUTES.home);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        if (typeof window.gtag === 'function') {
          const method = session.user.app_metadata?.provider === 'google' ? 'google' : 'magic_link';
          window.gtag('event', event === 'SIGNED_IN' ? 'login' : 'sign_up', { method });
        }
        navigate(ROUTES.home);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/site` },
      });
    } catch {
      toast.error('שגיאה בהתחברות עם Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/site` },
    });

    if (!error) {
      toast.success('קישור התחברות נשלח למייל שלך');
      setMagicLinkSent(true);
    } else {
      toast.error('שגיאה בשליחת הקישור');
    }
    setIsLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      dir="rtl"
      style={{
        backgroundImage: `url(${headerTexture})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Card className="w-full max-w-sm border-0 shadow-2xl bg-background/95 backdrop-blur">
        <CardHeader className="space-y-4 text-center pb-4">
          <img src={logo} alt="Logo" className="h-16 mx-auto" />
          <CardTitle className="text-2xl">התחברות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google OAuth - primary */}
          <Button
            type="button"
            className="w-full h-12 text-base"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <Chrome className="ml-2 h-5 w-5" />
            המשך עם Google
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-3 text-muted-foreground">או</span>
            </div>
          </div>

          {/* Magic link form */}
          {magicLinkSent ? (
            <div className="text-center space-y-3">
              <Mail className="h-10 w-10 mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                שלחנו קישור התחברות ל-<strong dir="ltr">{email}</strong>
              </p>
              <Button
                variant="ghost"
                className="text-sm"
                onClick={() => {
                  setMagicLinkSent(false);
                  setEmail("");
                }}
              >
                שלח שוב
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
                className="text-left"
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={isLoading || !email.trim()}
              >
                {isLoading ? "שולח..." : "שלח לי קישור"}
              </Button>
            </form>
          )}

          {/* Link back to store */}
          <div className="text-center pt-2">
            <Link
              to={ROUTES.home}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              חזרה לחנות
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
