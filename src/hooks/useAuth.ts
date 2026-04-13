import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'customer' | 'admin'>('customer');
  const [isLoading, setIsLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (data) setRole(data.role as 'customer' | 'admin');
  };

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    // First, get the current session synchronously
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && !initialized) {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchRole(session.user.id);
        }
        setIsLoading(false);
        initialized = true;
      }
    };

    checkSession();

    // Then listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchRole(session.user.id);
          } else {
            setRole('customer');
          }
          // Only set loading to false if we've already initialized
          if (initialized) {
            setIsLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, role, isLoading };
};
