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
 * @param {boolean} options.splitByGender - Mirror finalize_voting_round's
 *   per-gender ranking: compute displayRank, top-3 and danger zone WITHIN
 *   each gender so the male and female columns of a split leaderboard each
 *   start at #1, and "at risk" is decided against the per-gender cutoff
 *   (CEIL(advancingCount / 2)).
 * @returns {object} Leaderboard data and helpers
 */
export function useLeaderboard(competitionId, options = {}) {
  const {
    realtime = true,
    advancingCount,
    eliminationThreshold = 0.2,
    splitByGender = false,
  } = options;

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
          gender,
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

      // Fall back to the linked profile's avatar when the contestant row
      // doesn't have its own uploaded photo. Prefer the live profile name
      // over the denormalized contestants.name, which is frozen at entry
      // time and goes stale when the user edits their profile.
      const merged = (data || []).map((c) => {
        const profileName = `${c.profile?.first_name || ''} ${c.profile?.last_name || ''}`.trim();
        return {
          ...c,
          name: profileName || c.name,
          avatar_url: c.avatar_url || c.profile?.avatar_url || null,
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
                  avatar_url: payload.new.avatar_url || c.avatar_url,
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

    // Build per-partition rank, top-3 and danger info.
    //
    // When splitByGender is on, finalize_voting_round advances
    // CEIL(advancingCount / 2) per gender — so danger and rank must be
    // computed within each gender bucket too, otherwise a contestant
    // sitting at overall rank 25 in a 60-advance round looks "safe" even
    // though they may be rank 20 of 22 men with only 30 male slots.
    //
    // NULL-gender rows can't be placed in either bucket: 078 eliminates
    // them at round end, but pre-finalize they shouldn't pollute the
    // male/female danger math. Treat them as their own bucket with no
    // advance slots — everyone in it is at risk.
    const buildAtRisk = (activesInBucket, advanceCap) => {
      const cutoff =
        Number.isFinite(advanceCap) && advanceCap > 0
          ? advanceCap
          : Math.ceil(activesInBucket.length * (1 - eliminationThreshold));
      const atRisk = new Set();
      const displayRankById = new Map();
      activesInBucket.forEach((c, i) => {
        displayRankById.set(c.id, i + 1);
        if (i + 1 > cutoff) atRisk.add(c.id);
      });
      return { atRisk, displayRankById };
    };

    let atRiskIds;
    let displayRankById;
    if (splitByGender) {
      const perGenderCap = Number.isFinite(advancingCount) && advancingCount > 0
        ? Math.ceil(advancingCount / 2)
        : null;
      const maleActives = activeContestants.filter((c) => c.gender === 'male');
      const femaleActives = activeContestants.filter((c) => c.gender === 'female');
      const otherActives = activeContestants.filter(
        (c) => c.gender !== 'male' && c.gender !== 'female',
      );

      const male = buildAtRisk(maleActives, perGenderCap);
      const female = buildAtRisk(femaleActives, perGenderCap);
      // NULL/other gender: 0 advance slots — all flagged at risk.
      const other = buildAtRisk(otherActives, 0);

      atRiskIds = new Set([...male.atRisk, ...female.atRisk, ...other.atRisk]);
      displayRankById = new Map([
        ...male.displayRankById,
        ...female.displayRankById,
        ...other.displayRankById,
      ]);
    } else {
      const overall = buildAtRisk(activeContestants, advancingCount);
      atRiskIds = overall.atRisk;
      displayRankById = overall.displayRankById;
    }

    return sortedContestants.map((contestant, index) => {
      // Per-partition rank when split is on, otherwise the overall
      // position (or stored rank when sorting by rank).
      let rank;
      if (splitByGender) {
        rank = displayRankById.get(contestant.id) ?? index + 1;
      } else if (sortBy === 'rank') {
        rank = contestant.rank || index + 1;
      } else {
        rank = index + 1;
      }

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
  }, [sortedContestants, advancingCount, eliminationThreshold, sortBy, splitByGender]);

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
