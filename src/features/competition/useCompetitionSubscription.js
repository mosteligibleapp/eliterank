import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuthStore } from '../../stores';

export function useCompetitionSubscription(competitionId) {
  const user = useAuthStore(s => s.user);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || !user?.id || !competitionId || !isSupabaseConfigured()) {
      setIsSubscribed(false);
      return undefined;
    }

    setLoading(true);
    supabase
      .from('competition_subscribers')
      .select('id')
      .eq('competition_id', competitionId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error: queryError }) => {
        if (cancelled) return;
        if (queryError) {
          console.error('Failed to load subscription state:', queryError);
          setIsSubscribed(false);
        } else {
          setIsSubscribed(Boolean(data));
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id, competitionId]);

  const subscribe = useCallback(async () => {
    if (!isAuthenticated || !user?.id || !competitionId) return false;
    setLoading(true);
    setError(null);
    const { error: insertError } = await supabase
      .from('competition_subscribers')
      .upsert(
        { competition_id: competitionId, user_id: user.id },
        { onConflict: 'competition_id,user_id', ignoreDuplicates: true },
      );
    setLoading(false);
    if (insertError) {
      console.error('Failed to subscribe:', insertError);
      setError('Could not subscribe. Please try again.');
      return false;
    }
    setIsSubscribed(true);
    return true;
  }, [isAuthenticated, user?.id, competitionId]);

  const unsubscribe = useCallback(async () => {
    if (!isAuthenticated || !user?.id || !competitionId) return false;
    setLoading(true);
    setError(null);
    const { error: deleteError } = await supabase
      .from('competition_subscribers')
      .delete()
      .eq('competition_id', competitionId)
      .eq('user_id', user.id);
    setLoading(false);
    if (deleteError) {
      console.error('Failed to unsubscribe:', deleteError);
      setError('Could not unsubscribe. Please try again.');
      return false;
    }
    setIsSubscribed(false);
    return true;
  }, [isAuthenticated, user?.id, competitionId]);

  return { isSubscribed, loading, error, subscribe, unsubscribe };
}
