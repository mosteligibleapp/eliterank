import { supabase } from './supabase';
import { getContestantCompetitions, getNominationsForUser } from './competition-history';

/**
 * Get upcoming dates for a user's active competitions.
 * Returns a flat sorted array of upcoming events, voting rounds,
 * nomination periods, and finals dates.
 */
export async function getUpcomingDatesForUser(userId, userEmail) {
  if (!supabase || !userId) return [];

  try {
    // Get user's competitions (same pattern as ProfileBonusVotes)
    const [contestantEntries, nominations] = await Promise.all([
      getContestantCompetitions(userId),
      getNominationsForUser(userId, userEmail),
    ]);

    // Collect unique competition IDs and names from active competitions
    const competitionMap = new Map();

    contestantEntries.forEach(entry => {
      const comp = entry.competition;
      if (comp && comp.status !== 'completed' && comp.status !== 'archive') {
        competitionMap.set(comp.id, {
          id: comp.id,
          name: comp.name || '',
          finalsDate: comp.finals_date || null,
          orgSlug: comp.organization?.slug,
          slug: comp.slug,
        });
      }
    });

    nominations.forEach(nom => {
      const comp = nom.competition;
      if (comp && comp.status !== 'completed' && comp.status !== 'archive') {
        if (!competitionMap.has(comp.id)) {
          competitionMap.set(comp.id, {
            id: comp.id,
            name: comp.name || '',
            finalsDate: comp.finals_date || null,
            orgSlug: comp.organization?.slug,
            slug: comp.slug,
          });
        }
      }
    });

    const competitionIds = [...competitionMap.keys()];
    if (competitionIds.length === 0) return [];

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD for date comparisons

    // Fetch upcoming dates in parallel
    const [votingRoundsRes, nominationPeriodsRes, eventsRes] = await Promise.all([
      supabase
        .from('voting_rounds')
        .select('id, title, round_type, round_order, start_date, end_date, competition_id')
        .in('competition_id', competitionIds)
        .gte('end_date', now.toISOString())
        .order('start_date', { ascending: true }),
      supabase
        .from('nomination_periods')
        .select('id, title, period_order, start_date, end_date, competition_id')
        .in('competition_id', competitionIds)
        .gte('end_date', now.toISOString())
        .order('start_date', { ascending: true }),
      supabase
        .from('events')
        .select('id, name, date, end_date, time, is_double_vote_day, competition_id')
        .in('competition_id', competitionIds)
        .gte('date', today)
        .neq('status', 'completed')
        .order('date', { ascending: true }),
    ]);

    const dates = [];

    // Voting rounds
    (votingRoundsRes.data || []).forEach(round => {
      const comp = competitionMap.get(round.competition_id);
      const type = round.round_type === 'judging' ? 'judging_round' : 'voting_round';
      const label = round.title || `Round ${round.round_order || 1} ${round.round_type === 'judging' ? 'Judging' : 'Voting'}`;

      dates.push({
        id: `vr-${round.id}`,
        type,
        label,
        date: round.start_date,
        endDate: round.end_date,
        competitionId: round.competition_id,
        competitionName: comp?.name || '',
      });
    });

    // Nomination periods
    (nominationPeriodsRes.data || []).forEach(period => {
      const comp = competitionMap.get(period.competition_id);
      const label = period.title || `Nomination Period ${period.period_order || 1}`;

      dates.push({
        id: `np-${period.id}`,
        type: 'nomination_period',
        label,
        date: period.start_date,
        endDate: period.end_date,
        competitionId: period.competition_id,
        competitionName: comp?.name || '',
      });
    });

    // Events
    (eventsRes.data || []).forEach(event => {
      const comp = competitionMap.get(event.competition_id);
      const label = event.name || 'Event';

      dates.push({
        id: `ev-${event.id}`,
        type: 'event',
        label: event.is_double_vote_day ? `${label} (2x Votes)` : label,
        date: event.date,
        endDate: event.end_date || null,
        competitionId: event.competition_id,
        competitionName: comp?.name || '',
        meta: { time: event.time, isDoubleVote: event.is_double_vote_day },
      });
    });

    // Finals dates
    competitionMap.forEach((comp) => {
      if (comp.finalsDate && new Date(comp.finalsDate) >= now) {
        dates.push({
          id: `finals-${comp.id}`,
          type: 'finals',
          label: 'Finals',
          date: comp.finalsDate,
          endDate: null,
          competitionId: comp.id,
          competitionName: comp.name,
        });
      }
    });

    // Sort by date ascending
    dates.sort((a, b) => new Date(a.date) - new Date(b.date));

    return dates;
  } catch (err) {
    console.error('Error in getUpcomingDatesForUser:', err);
    return [];
  }
}
