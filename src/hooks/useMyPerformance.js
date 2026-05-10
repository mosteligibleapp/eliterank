import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * useMyPerformance
 *
 * Fetches the current user's contestant rows across every competition they're
 * still active in, so the profile dropdown can surface lifetime votes, votes
 * this round, and current rank from any page (not just the competition page).
 *
 * Returns an array sorted by competition status (live first), each entry
 * shaped:
 *   {
 *     competitionId, competitionName, orgSlug, competitionSlug,
 *     totalVotes, roundVotes, rank, roundLabel
 *   }
 *
 * Filters out 'removed' contestants and completed/archived competitions.
 */
export function useMyPerformance(userId) {
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!userId || !isSupabaseConfigured()) {
      setPerformances([]);
      return;
    }

    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('contestants')
        .select(`
          id,
          competition_id,
          votes,
          lifetime_votes,
          rank,
          status,
          competition:competitions(
            id,
            name,
            slug,
            status,
            organization:organizations(slug)
          )
        `)
        .eq('user_id', userId)
        .neq('status', 'removed');

      if (error) throw error;

      // Keep only contestants in still-running competitions
      const liveStatuses = new Set([
        'publish', 'live', 'upcoming', 'nomination', 'voting', 'finals',
      ]);
      const eligible = (rows || []).filter(
        (r) => r.competition && liveStatuses.has(r.competition.status),
      );
      if (eligible.length === 0) {
        setPerformances([]);
        return;
      }

      // Find the currently-active voting round for each competition in one shot
      const competitionIds = eligible.map((r) => r.competition_id);
      const nowIso = new Date().toISOString();
      const { data: rounds } = await supabase
        .from('voting_rounds')
        .select('competition_id, title, round_order, start_date, end_date')
        .in('competition_id', competitionIds)
        .lte('start_date', nowIso)
        .gte('end_date', nowIso);

      const roundByCompetition = new Map();
      (rounds || []).forEach((rnd) => {
        // Prefer the highest-order active round (handles overlapping rows)
        const existing = roundByCompetition.get(rnd.competition_id);
        if (!existing || (rnd.round_order || 0) > (existing.round_order || 0)) {
          roundByCompetition.set(rnd.competition_id, rnd);
        }
      });

      // Compute rank per competition. The contestants.rank column is
      // populated only at round finalization (see migration 053), so for
      // live competitions we derive Olympic rank from "active contestants
      // with more votes than me, plus one". Eliminated entries get no rank.
      const ranks = await Promise.all(
        eligible.map(async (r) => {
          if (r.status !== 'active') return null;
          const myVotes = r.votes ?? 0;
          const { count, error: countError } = await supabase
            .from('contestants')
            .select('id', { count: 'exact', head: true })
            .eq('competition_id', r.competition_id)
            .eq('status', 'active')
            .gt('votes', myVotes);
          if (countError) {
            console.error('rank lookup failed:', countError);
            return null;
          }
          return (count ?? 0) + 1;
        }),
      );

      const shaped = eligible.map((r, idx) => {
        const rnd = roundByCompetition.get(r.competition_id);
        return {
          competitionId: r.competition_id,
          competitionName: r.competition.name || 'Competition',
          orgSlug: r.competition.organization?.slug || null,
          competitionSlug: r.competition.slug || null,
          totalVotes: r.lifetime_votes ?? 0,
          roundVotes: r.votes ?? 0,
          rank: ranks[idx],
          roundLabel: rnd?.title || 'Current round',
        };
      });

      // Live competitions first, then by name
      shaped.sort((a, b) => a.competitionName.localeCompare(b.competitionName));
      setPerformances(shaped);
    } catch (err) {
      console.error('useMyPerformance fetch failed:', err);
      setPerformances([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { performances, loading, refetch: fetch };
}

export default useMyPerformance;
