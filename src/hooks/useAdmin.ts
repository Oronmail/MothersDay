import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

/** Turn a Supabase auth error into something the admin can act on, in Hebrew. */
const loginErrorMessage = (error: { message?: string; code?: string; status?: number }): string => {
  const code = error.code ?? '';
  const message = error.message ?? '';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return 'אימייל או סיסמה שגויים';
  }
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) {
    return 'כתובת המייל עדיין לא אומתה. בדקי את תיבת הדואר.';
  }
  if (error.status === 429 || /rate limit/i.test(message)) {
    return 'יותר מדי ניסיונות התחברות. נסי שוב בעוד כמה דקות.';
  }
  if (/failed to fetch|networkerror|network request failed/i.test(message)) {
    return 'אין חיבור לשרת. בדקי את החיבור לאינטרנט ונסי שוב.';
  }
  return 'ההתחברות נכשלה. נסי שוב.';
};

export const useAdmin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Same rule as useAuth: the auth callback stays synchronous — querying
    // Supabase inside it deadlocks client initialization (admin area frozen
    // on "טוען..."). The admin-role check runs in the effect below.
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
        setAuthResolved(true);
      })
      .catch(() => {
        if (mounted) {
          setUser(null);
          setAuthResolved(true);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
        setAuthResolved(true);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // AdminRoute redirects to the login page whenever !isAdmin && !isLoading,
  // so isLoading settles only once the role answer is in (or there is
  // definitely no user).
  const userId = user?.id;
  useEffect(() => {
    if (!authResolved) return;

    if (!userId) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const checkRole = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        if (!cancelled) setIsAdmin(data?.role === 'admin');
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    checkRole();

    return () => { cancelled = true; };
  }, [authResolved, userId]);

  /**
   * Signs in and verifies the admin role in one step. A non-admin used to be signed
   * in and then bounced back to the login screen with no explanation, so here the
   * session is dropped again and a Hebrew reason is thrown for the form to show.
   */
  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(loginErrorMessage(error));

    const signedInId = data.user?.id;
    if (!signedInId) throw new Error('ההתחברות נכשלה. נסי שוב.');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', signedInId)
      .single();

    // PGRST116 = no matching row, i.e. a user with no profile — not an admin.
    if (profileError && profileError.code !== 'PGRST116') {
      await supabase.auth.signOut();
      throw new Error('לא הצלחנו לבדוק את הרשאות הניהול. נסי שוב בעוד רגע.');
    }

    if (profile?.role !== 'admin') {
      await supabase.auth.signOut();
      throw new Error('החשבון הזה אינו חשבון ניהול. אם זו טעות, יש לבקש הרשאת ניהול.');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return { user, isAdmin, isLoading, login, logout };
};
