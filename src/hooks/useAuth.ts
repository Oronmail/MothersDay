import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    // First, get the current session synchronously
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && !initialized) {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        initialized = true;
      }
    };

    checkSession();

    // Then listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
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

  return { user, session, isLoading };
};
