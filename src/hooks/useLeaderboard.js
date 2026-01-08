import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Hook for fetching and managing leaderboard data
 *
 * @param {string} competitionId - Competition UUID
 * @param {object} options - Configuration options
 * @param {boolean} options.realtime - Enable real-time updates (default: true)
 * @param {number} options.eliminationThreshold - Percentage for danger zone (default: 0.2 = bottom 20%)
 * @returns {object} Leaderboard data and helpers
 */
export function useLeaderboard(competitionId, options = {}) {
  const { realtime = true, eliminationThreshold = 0.2 } = options;

  const [contestants, setContestants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('rank'); // 'rank', 'votes', 'recent'

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
          updated_at
        `
        )
        .eq('competition_id', competitionId)
        .eq('status', 'active') // Only active contestants
        .order('rank', { ascending: true, nullsFirst: false });

      if (fetchError) throw fetchError;

      setContestants(data || []);
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
            if (payload.new.status === 'active') {
              setContestants((prev) => [...prev, payload.new]);
            }
          } else if (payload.eventType === 'UPDATE') {
            setContestants((prev) =>
              prev.map((c) =>
                c.id === payload.new.id ? { ...c, ...payload.new } : c
              )
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

  // Sorted contestants
  const sortedContestants = useMemo(() => {
    const sorted = [...contestants];

    switch (sortBy) {
      case 'votes':
        sorted.sort((a, b) => (b.votes || 0) - (a.votes || 0));
        break;
      case 'recent':
        sorted.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        break;
      case 'rank':
      default:
        sorted.sort((a, b) => (a.rank || 999) - (b.rank || 999));
        break;
    }

    return sorted;
  }, [contestants, sortBy]);

  // Ranked contestants with zone info
  const rankedContestants = useMemo(() => {
    const total = sortedContestants.length;
    const dangerZoneStart = Math.ceil(total * (1 - eliminationThreshold));

    return sortedContestants.map((contestant, index) => {
      const rank =
        sortBy === 'rank' ? contestant.rank || index + 1 : index + 1;
      const isInDangerZone = rank > dangerZoneStart;
      const isTop3 = rank <= 3;

      return {
        ...contestant,
        displayRank: rank,
        zone: isInDangerZone ? 'danger' : isTop3 ? 'prize' : 'safe',
        isInDangerZone,
        isTop3,
      };
    });
  }, [sortedContestants, eliminationThreshold, sortBy]);

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
