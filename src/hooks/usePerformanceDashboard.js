import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * usePerformanceDashboard
 *
 * Builds the contestant-facing "performance" view: for every competition the
 * user entered (any status except removed), it returns their lifetime vote
 * total broken down into free / paid / bonus, how far they advanced (rounds
 * reached vs. total rounds), and the roster of contestants they competed
 * against.
 *
 * Vote breakdown comes straight from the never-reset lifetime_* counters on
 * `contestants` (migration 054), so the numbers reflect the whole competition
 * rather than just the current round.
 *
 * Returns an array, one entry per competition, shaped:
 *   {
 *     competitionId, competitionName, citySeason, orgName, orgLogo,
 *     orgSlug, competitionSlug, competitionStatus,
 *     myContestantId, myStatus, placement, fieldSize,
 *     roundsReached, totalRounds,
 *     totalVotes, freeVotes, paidVotes, bonusVotes,
 *     competitors: [
 *       { id, name, avatarUrl, city, status, votes }
 *     ]
 *   }
 */
export function usePerformanceDashboard(userId) {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId || !isSupabaseConfigured()) {
      setCompetitions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. The user's own contestant rows, with the lifetime vote breakdown
      //    and enough competition metadata to render a header per card.
      const { data: myRows, error: myErr } = await supabase
        .from('contestants')
        .select(`
          id,
          competition_id,
          status,
          rank,
          eliminated_in_round,
          current_round,
          lifetime_votes,
          lifetime_free_votes,
          lifetime_paid_votes,
          lifetime_bonus_votes,
          competition:competitions(
            id,
            name,
            slug,
            season,
            status,
            city:cities(name),
            organization:organizations(name, slug, logo_url)
          )
        `)
        .eq('user_id', userId)
        .neq('status', 'removed');

      if (myErr) throw myErr;

      const entries = (myRows || []).filter((r) => r.competition);
      if (entries.length === 0) {
        setCompetitions([]);
        return;
      }

      const competitionIds = entries.map((r) => r.competition_id);

      // 2. Every contestant in those competitions (the user included). One
      //    round trip covers all the cards. Mirrors useLeaderboard's name /
      //    avatar fallbacks so the roster matches the public leaderboard.
      const { data: allContestants, error: rosterErr } = await supabase
        .from('contestants')
        .select(`
          id,
          competition_id,
          name,
          avatar_url,
          city,
          status,
          lifetime_votes,
          profile:profiles!user_id(avatar_url, first_name, last_name)
        `)
        .in('competition_id', competitionIds)
        .neq('status', 'removed');

      if (rosterErr) throw rosterErr;

      const roster = allContestants || [];

      // 3. Number of voting rounds per competition, so we can show how far the
      //    contestant advanced ("Round 3 of 4"). Only voting rounds count
      //    toward the total (other round_types are skipped, matching the
      //    public timeline's notion of a round).
      const totalRoundsByCompetition = new Map();
      const { data: rounds } = await supabase
        .from('voting_rounds')
        .select('competition_id, round_type')
        .in('competition_id', competitionIds);
      (rounds || []).forEach((r) => {
        if (r.round_type && r.round_type !== 'voting') return;
        totalRoundsByCompetition.set(
          r.competition_id,
          (totalRoundsByCompetition.get(r.competition_id) || 0) + 1,
        );
      });

      // Group the roster by competition for quick lookup.
      const rosterByCompetition = new Map();
      roster.forEach((c) => {
        const list = rosterByCompetition.get(c.competition_id) || [];
        list.push(c);
        rosterByCompetition.set(c.competition_id, list);
      });

      const resolveName = (c) => {
        const profileName = `${c.profile?.first_name || ''} ${c.profile?.last_name || ''}`.trim();
        return profileName || c.name || 'Contestant';
      };

      const shaped = entries.map((mine) => {
        const comp = mine.competition;
        const field = rosterByCompetition.get(mine.competition_id) || [];

        // Olympic placement by lifetime votes, kept consistent with the
        // totals shown on the card (the stored rank is round-scoped and only
        // set at finalization, so we derive it from the same lifetime number).
        const myVotes = mine.lifetime_votes ?? 0;
        const ahead = field.filter((c) => (c.lifetime_votes ?? 0) > myVotes).length;

        const competitors = field
          .filter((c) => c.id !== mine.id)
          .map((c) => ({
            id: c.id,
            name: resolveName(c),
            avatarUrl: c.avatar_url || c.profile?.avatar_url || null,
            city: c.city || null,
            status: c.status,
            votes: c.lifetime_votes ?? 0,
          }))
          .sort((a, b) => b.votes - a.votes);

        const city = comp.city?.name || '';
        const citySeason = [city, comp.season].filter(Boolean).join(' · ');

        // How far they advanced. Winners ran the whole gauntlet; eliminated
        // contestants reached the round they went out in; everyone still in
        // is measured by their current round. Falls back to round 1.
        const totalRounds = totalRoundsByCompetition.get(mine.competition_id) || 0;
        const roundsReached = mine.status === 'winner'
          ? (totalRounds || mine.current_round || 1)
          : (mine.eliminated_in_round || mine.current_round || 1);

        return {
          competitionId: mine.competition_id,
          competitionName: comp.name || 'Competition',
          citySeason,
          orgName: comp.organization?.name || null,
          orgLogo: comp.organization?.logo_url || null,
          orgSlug: comp.organization?.slug || null,
          competitionSlug: comp.slug || null,
          competitionStatus: comp.status,
          myContestantId: mine.id,
          myStatus: mine.status,
          placement: ahead + 1,
          fieldSize: field.length,
          roundsReached,
          totalRounds,
          totalVotes: myVotes,
          freeVotes: mine.lifetime_free_votes ?? 0,
          paidVotes: mine.lifetime_paid_votes ?? 0,
          bonusVotes: mine.lifetime_bonus_votes ?? 0,
          competitors,
        };
      });

      // Highest-vote competitions first so the most active entry leads.
      shaped.sort((a, b) => b.totalVotes - a.totalVotes);
      setCompetitions(shaped);
    } catch (err) {
      console.error('usePerformanceDashboard fetch failed:', err);
      setCompetitions([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { competitions, loading, refetch: fetchData };
}

export default usePerformanceDashboard;
