import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { login } = useAdmin();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      // useAdmin.login throws a ready-to-show Hebrew reason (wrong password,
      // no admin permission, no connection…).
      const message = err instanceof Error && err.message ? err.message : 'שגיאה בהתחברות';
      setLoginError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('יש להזין כתובת אימייל תחילה');
      return;
    }
    setResetting(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      // Swallow errors so we never reveal whether an address is registered.
    } finally {
      // Neutral message regardless of outcome (avoids leaking account existence).
      toast.success('אם הכתובת רשומה במערכת, נשלח אליה קישור לאיפוס סיסמה');
      setResetting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background" dir="rtl">
      <div className="w-full max-w-sm p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">ניהול האתר</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="אימייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            dir="ltr"
          />
          <Input
            type="password"
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            dir="ltr"
          />
          {loginError && (
            <p role="alert" className="text-sm text-destructive text-center">
              {loginError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'מתחברת...' : 'התחברי'}
          </Button>
        </form>
        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={resetting}
          className="block w-full text-center text-sm text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
        >
          {resetting ? 'שולח...' : 'שכחת סיסמה?'}
        </button>
      </div>
    </div>
  );
};
