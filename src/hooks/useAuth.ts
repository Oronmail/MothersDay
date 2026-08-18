import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'customer' | 'admin'>('customer');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Resolve the current session, then track changes. The callback MUST stay
    // synchronous: awaiting Supabase queries inside onAuthStateChange deadlocks
    // the client while it initializes (page frozen on its loading spinner
    // whenever the stored token needs a refresh on entry) — the profiles role
    // is fetched by the separate effect below instead.
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Role lookup lives outside the auth callback (see note above). isLoading
  // does not wait for it: pages gate on the session, the role refines after.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setRole('customer');
      return;
    }

    let cancelled = false;
    const fetchRole = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        if (!cancelled && data) setRole(data.role as 'customer' | 'admin');
      } catch {
        // Keep the default role on failure.
      }
    };
    fetchRole();

    return () => { cancelled = true; };
  }, [userId]);

  return { user, session, role, isLoading };
};
