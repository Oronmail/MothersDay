import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

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

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return { user, isAdmin, isLoading, login, logout };
};
