import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

/**
 * Mounted once (see AccountSync): after login, asks the server to attach past
 * guest orders (same verified email) to this account, so they appear under
 * "ההזמנות שלי". Fire-and-forget: local dev has no /api, and a failure just
 * means the orders stay guest orders until the next login.
 */
export function useClaimOrders() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const claimedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || claimedForUserRef.current === userId) return;
    claimedForUserRef.current = userId;

    let cancelled = false;

    const claim = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token || cancelled) return;

      try {
        await fetch('/api/claim-orders', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Unreachable (local dev) — nothing to clean up, retried next login.
      }
    };

    claim();
    return () => {
      cancelled = true;
    };
  }, [userId]);
}
