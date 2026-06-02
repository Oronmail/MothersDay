import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type Status = 'verifying' | 'ready' | 'error';

const MIN_PASSWORD_LENGTH = 8;

const ResetPassword = () => {
  const [status, setStatus] = useState<Status>('verifying');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  // The recovery link drops a token in the URL; supabase-js parses it and
  // fires PASSWORD_RECOVERY. We treat any active session here as "may set a
  // password" (also covers an already-signed-in admin changing their password).
  useEffect(() => {
    // An expired/invalid link redirects back with an error in the URL hash.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hashParams.get('error')) {
      setStatus('error');
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setStatus('ready');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStatus('ready');
    });

    // If no recovery session materialises, the link was missing or expired.
    const timeout = setTimeout(() => {
      setStatus((current) => (current === 'verifying' ? 'error' : current));
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`);
      return;
    }
    if (password !== confirm) {
      toast.error('הסיסמאות אינן תואמות');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('הסיסמה עודכנה בהצלחה');
      navigate('/admin', { replace: true });
    } catch {
      toast.error('שגיאה בעדכון הסיסמה. ייתכן שהקישור פג תוקף');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background" dir="rtl">
      <div className="w-full max-w-sm p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">איפוס סיסמה</h1>

        {status === 'verifying' && (
          <p className="text-center text-muted-foreground">מאמת את הקישור...</p>
        )}

        {status === 'error' && (
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground">
              הקישור אינו תקין או שפג תוקפו. אנא בקשו קישור חדש.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/admin/login', { replace: true })}
            >
              חזרה להתחברות
            </Button>
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="סיסמה חדשה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              dir="ltr"
              autoComplete="new-password"
            />
            <Input
              type="password"
              placeholder="אימות סיסמה"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              dir="ltr"
              autoComplete="new-password"
            />
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'מעדכן...' : 'עדכון סיסמה'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
