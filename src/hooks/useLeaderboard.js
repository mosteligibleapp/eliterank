import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Hook for fetching and managing leaderboard data
 *
 * @param {string} competitionId - Competition UUID
 * @param {object} options - Configuration options
 * @param {boolean} options.realtime - Enable real-time updates (default: true)
 * @param {number} options.advancingCount - How many contestants advance to the
 *   next round. When provided, anyone ranked below this cutoff is flagged as
 *   at risk of elimination (i.e. rank > advancingCount). Falls back to the
 *   percentage-based threshold when not set.
 * @param {number} options.eliminationThreshold - Percentage for danger zone,
 *   used only when advancingCount is not provided (default: 0.2 = bottom 20%)
 * @returns {object} Leaderboard data and helpers
 */
export function useLeaderboard(competitionId, options = {}) {
  const { realtime = true, advancingCount, eliminationThreshold = 0.2 } = options;

  const [contestants, setContestants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('votes'); // 'votes', 'rank', 'recent'

  const isDemoMode = !isSupabaseConfigured();

  // Fetch contestants
  const fetchContestants = useCallback(async () => {
    if (!competitionId || isDemoMode) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('contestants')
        .select(
          `
          id,
          user_id,
          name,
          email,
          age,
          bio,
          avatar_url,
          instagram,
          status,
          votes,
          lifetime_votes,
          rank,
          trend,
          city,
          slug,
          profile_views,
          external_shares,
          eliminated_in_round,
          advancement_status,
          current_round,
          created_at,
          updated_at,
          profile:profiles!user_id(avatar_url, first_name, last_name)
        `
        )
        .eq('competition_id', competitionId)
        // Eliminated contestants stay on the leaderboard (visually flagged
        // and non-clickable); only fully removed rows are excluded.
        .neq('status', 'removed')
        .order('rank', { ascending: true, nullsFirst: false });

      if (fetchError) throw fetchError;

      // Prefer the live profile name and avatar over the denormalized
      // contestants columns, which are frozen at entry time and go stale
      // when the user edits their profile. A DB trigger keeps these in
      // sync, but preferring profile here is defense in depth against
      // brief stale-cache windows and any direct writes that bypass the
      // trigger. For unlinked contestants we fall back to the contestant
      // row's own column as the canonical source.
      const merged = (data || []).map((c) => {
        const profileName = `${c.profile?.first_name || ''} ${c.profile?.last_name || ''}`.trim();
        return {
          ...c,
          name: profileName || c.name,
          avatar_url: c.profile?.avatar_url || c.avatar_url || null,
        };
      });

      setContestants(merged);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [competitionId, isDemoMode]);

  // Initial fetch
  useEffect(() => {
    fetchContestants();
  }, [fetchContestants]);

  // Real-time subscription
  useEffect(() => {
    if (!competitionId || !realtime || isDemoMode) return;

    const subscription = supabase
      .channel(`leaderboard-${competitionId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'contestants',
          filter: `competition_id=eq.${competitionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Eliminated rows are kept on the leaderboard (non-clickable);
            // only fully-removed contestants stay out.
            if (payload.new.status !== 'removed') {
              setContestants((prev) => [...prev, payload.new]);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Realtime payloads don't include the joined profile row, so
            // preserve the previously-resolved avatar_url and profile-derived
            // name when the update doesn't carry a new one.
            setContestants((prev) =>
              prev.map((c) => {
                if (c.id !== payload.new.id) return c;
                const profileName = `${c.profile?.first_name || ''} ${c.profile?.last_name || ''}`.trim();
                return {
                  ...c,
                  ...payload.new,
                  name: profileName || payload.new.name || c.name,
                  avatar_url: c.profile?.avatar_url || payload.new.avatar_url || c.avatar_url,
                };
              })
            );
          } else if (payload.eventType === 'DELETE') {
            setContestants((prev) =>
              prev.filter((c) => c.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [competitionId, realtime, isDemoMode]);

  // Sorted contestants — eliminated contestants always rank below all active
  // ones regardless of vote count (post-reset advancers can have lower vote
  // totals than eliminated contestants, but they're still in the running).
  const sortedContestants = useMemo(() => {
    const sorted = [...contestants];
    const tier = (c) => (c.status === 'eliminated' ? 1 : 0);

    switch (sortBy) {
      case 'votes':
        sorted.sort((a, b) => {
          const t = tier(a) - tier(b);
          if (t !== 0) return t;
          return (b.votes || 0) - (a.votes || 0);
        });
        break;
      case 'recent':
        sorted.sort((a, b) => {
          const t = tier(a) - tier(b);
          if (t !== 0) return t;
          return new Date(b.updated_at) - new Date(a.updated_at);
        });
        break;
      case 'rank':
      default:
        sorted.sort((a, b) => {
          const t = tier(a) - tier(b);
          if (t !== 0) return t;
          return (a.rank || 999) - (b.rank || 999);
        });
        break;
    }

    return sorted;
  }, [contestants, sortBy]);

  // Ranked contestants with zone info
  const rankedContestants = useMemo(() => {
    // The "at risk of elimination" cohort is computed against contestants
    // who are still in the running for THIS round — eliminated rows stay
    // on the leaderboard for display but were already cut in a prior
    // round, so flagging them as at-risk again would inflate the count
    // (e.g. 89 total, top-25 advancing → 64 wrongly flagged instead of
    // the correct 25 = 50 active − 25 advancing).
    const activeContestants = sortedContestants.filter(
      (c) => c.status === 'active',
    );
    const activeTotal = activeContestants.length;

    // Prefer the round's explicit advancing count (e.g. "top 25 move on")
    // so the danger zone reflects the actual elimination cutoff. Only fall
    // back to the percentage threshold (over the active roster) when no
    // advancing count is supplied.
    const dangerZoneStart =
      Number.isFinite(advancingCount) && advancingCount > 0
        ? advancingCount
        : Math.ceil(activeTotal * (1 - eliminationThreshold));

    // Build the at-risk set from the active roster only. Eliminated
    // contestants are never marked as in-danger again.
    const atRiskIds = new Set();
    activeContestants.forEach((c, i) => {
      if (i + 1 > dangerZoneStart) atRiskIds.add(c.id);
    });

    return sortedContestants.map((contestant, index) => {
      const rank =
        sortBy === 'rank' ? contestant.rank || index + 1 : index + 1;
      const isInDangerZone = atRiskIds.has(contestant.id);
      const isTop3 = rank <= 3;

      return {
        ...contestant,
        displayRank: rank,
        zone: isInDangerZone ? 'danger' : isTop3 ? 'prize' : 'safe',
        isInDangerZone,
        isTop3,
      };
    });
  }, [sortedContestants, advancingCount, eliminationThreshold, sortBy]);

  // Top 3 contestants
  const topThree = useMemo(() => {
    return rankedContestants.filter((c) => c.displayRank <= 3);
  }, [rankedContestants]);

  // Contestants in danger zone
  const dangerZone = useMemo(() => {
    return rankedContestants.filter((c) => c.isInDangerZone);
  }, [rankedContestants]);

  // Get contestant by ID
  const getContestant = useCallback(
    (id) => {
      return rankedContestants.find((c) => c.id === id);
    },
    [rankedContestants]
  );

  // Get contestant by slug
  const getContestantBySlug = useCallback(
    (slug) => {
      return rankedContestants.find((c) => c.slug === slug);
    },
    [rankedContestants]
  );

  // Stats
  const stats = useMemo(() => {
    const totalVotes = contestants.reduce(
      (sum, c) => sum + (c.votes || 0),
      0
    );
    const avgVotes =
      contestants.length > 0 ? totalVotes / contestants.length : 0;

    return {
      totalContestants: contestants.length,
      totalVotes,
      avgVotes: Math.round(avgVotes),
      dangerZoneCount: dangerZone.length,
    };
  }, [contestants, dangerZone]);

  // Change sort
  const changeSort = useCallback((newSort) => {
    if (['rank', 'votes', 'recent'].includes(newSort)) {
      setSortBy(newSort);
    }
  }, []);

  return {
    contestants: rankedContestants,
    topThree,
    dangerZone,
    stats,

    // Sorting
    sortBy,
    changeSort,

    // Helpers
    getContestant,
    getContestantBySlug,

    // State
    loading,
    error,
    refetch: fetchContestants,
  };
}

export default useLeaderboard;
