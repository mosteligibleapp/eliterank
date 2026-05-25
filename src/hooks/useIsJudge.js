import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

const CACHE_KEY_PREFIX = 'is_judge:';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * useIsJudge — returns true if the logged-in user has any `judges` rows.
 *
 * Light query (count only) with sessionStorage cache so it runs at most once
 * per 5 minutes per user. Used to surface a "Judge Dashboard" link in the
 * user menu.
 */
export default function useIsJudge() {
  const user = useAuthStore(s => s.user);
  const userId = user?.id;
  const [isJudge, setIsJudge] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsJudge(false);
      return;
    }

    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.exp && parsed.exp > Date.now()) {
          setIsJudge(!!parsed.value);
          return;
        }
      }
    } catch { /* ignore storage errors */ }

    let cancelled = false;
    (async () => {
      try {
        const { count, error } = await supabase
          .from('judges')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        if (error) throw error;
        const value = (count || 0) > 0;
        if (!cancelled) setIsJudge(value);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ value, exp: Date.now() + CACHE_TTL_MS }));
        } catch { /* ignore */ }
      } catch {
        if (!cancelled) setIsJudge(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  return isJudge;
}
