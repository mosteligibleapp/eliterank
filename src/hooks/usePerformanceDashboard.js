import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * usePerformanceDashboard
 *
 * Builds the contestant-facing "performance" view: for every competition the
 * user entered (any status except removed), it returns their lifetime vote
 * total broken down into free / paid / bonus, plus the roster of contestants
 * they competed against and each of those competitors' fan counts.
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
 *     totalVotes, freeVotes, paidVotes, bonusVotes, myFans,
 *     competitors: [
 *       { id, name, avatarUrl, city, status, votes, fanCount }
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

      // 3. Fan counts for the whole roster in one query, then tally locally.
      //    contestant_fans is publicly readable (it backs the fan modal on
      //    public profiles), so we can count fans for competitors too.
      const allIds = roster.map((c) => c.id);
      const fanCountById = new Map();
      if (allIds.length > 0) {
        const { data: fanRows } = await supabase
          .from('contestant_fans')
          .select('contestant_id')
          .in('contestant_id', allIds);
        (fanRows || []).forEach((f) => {
          fanCountById.set(f.contestant_id, (fanCountById.get(f.contestant_id) || 0) + 1);
        });
      }

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
            fanCount: fanCountById.get(c.id) || 0,
          }))
          .sort((a, b) => b.votes - a.votes);

        const city = comp.city?.name || '';
        const citySeason = [city, comp.season].filter(Boolean).join(' · ');

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
          totalVotes: myVotes,
          freeVotes: mine.lifetime_free_votes ?? 0,
          paidVotes: mine.lifetime_paid_votes ?? 0,
          bonusVotes: mine.lifetime_bonus_votes ?? 0,
          myFans: fanCountById.get(mine.id) || 0,
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
