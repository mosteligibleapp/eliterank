import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getCompetitionPhase } from '../utils/getCompetitionPhase';
import {
  calculatePrizePool,
  calculateVoteRevenue,
} from '../utils/calculatePrizePool';

/**
 * Fetch public competition data by org slug, city slug, and optional year
 *
 * This hook is designed to work with the existing EliteRank schema.
 * It fetches data using separate queries (not nested joins) for compatibility.
 *
 * @param {string} orgSlug - Organization slug (e.g., 'most-eligible')
 * @param {string} citySlug - City slug (e.g., 'chicago')
 * @param {string|number} year - Optional year (e.g., '2026')
 * @returns {object} Competition data, phase info, loading state, and helpers
 */
export function useCompetitionPublic(orgSlug, citySlug, year = null) {
  const [competition, setCompetition] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [contestants, setContestants] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [events, setEvents] = useState([]);
  const [rules, setRules] = useState([]);
  const [votingRounds, setVotingRounds] = useState([]);
  const [nominationPeriods, setNominationPeriods] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isDemoMode = !isSupabaseConfigured();

  // Convert city slug to a searchable format
  const citySearchTerm = useMemo(() => {
    if (!citySlug) return '';
    // Convert 'new-york' to 'new york' for ilike search
    return citySlug.replace(/-/g, ' ');
  }, [citySlug]);

  // Fetch competition data
  const fetchCompetition = useCallback(async () => {
    if (!citySlug) {
      setError(new Error('Missing city slug'));
      setLoading(false);
      return;
    }

    if (isDemoMode) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Find the competition by city name
      // Try to match city name in competitions table
      let competitionQuery = supabase
        .from('competitions')
        .select('*')
        .ilike('city', `%${citySearchTerm}%`);

      // Filter by year/season if provided
      if (year) {
        competitionQuery = competitionQuery.eq('season', String(year));
      }

      // Order by most recent and get first match
      competitionQuery = competitionQuery
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: compData, error: compError } = await competitionQuery;

      if (compError) throw compError;

      const foundCompetition = compData?.[0];
      if (!foundCompetition) {
        throw new Error(`Competition not found for ${citySlug}`);
      }

      setCompetition(foundCompetition);

      // Step 2: Fetch related data in parallel
      const competitionId = foundCompetition.id;

      const [
        contestantsRes,
        sponsorsRes,
        eventsRes,
        announcementsRes,
        votingRoundsRes,
        votesRes,
      ] = await Promise.all([
        // Contestants
        supabase
          .from('contestants')
          .select('*')
          .eq('competition_id', competitionId)
          .order('rank', { ascending: true, nullsFirst: false }),

        // Sponsors
        supabase
          .from('sponsors')
          .select('*')
          .eq('competition_id', competitionId)
          .order('sort_order', { ascending: true }),

        // Events (public only)
        supabase
          .from('events')
          .select('*')
          .eq('competition_id', competitionId)
          .order('date', { ascending: true }),

        // Announcements
        supabase
          .from('announcements')
          .select('*')
          .eq('competition_id', competitionId)
          .order('pinned', { ascending: false })
          .order('published_at', { ascending: false }),

        // Voting rounds
        supabase
          .from('voting_rounds')
          .select('*')
          .eq('competition_id', competitionId)
          .order('round_order', { ascending: true }),

        // Votes for prize pool calculation
        supabase
          .from('votes')
          .select('amount_paid')
          .eq('competition_id', competitionId),
      ]);

      // Set state from results (handle errors gracefully)
      setContestants(contestantsRes.data || []);
      setSponsors(sponsorsRes.data || []);
      setEvents((eventsRes.data || []).filter(e => e.public_visible !== false));
      setAnnouncements((announcementsRes.data || []).filter(a => a.published_at));
      setVotingRounds(votingRoundsRes.data || []);
      setVotes(votesRes.data || []);

      // Optional: Try to fetch organization if org_id exists
      if (foundCompetition.organization_id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', foundCompetition.organization_id)
          .single();

        if (orgData) {
          setOrganization(orgData);
        }
      }

      // Optional: Try to fetch rules if table exists
      try {
        const { data: rulesData } = await supabase
          .from('competition_rules')
          .select('*')
          .eq('competition_id', competitionId)
          .order('sort_order', { ascending: true });

        setRules(rulesData || []);
      } catch {
        // Table may not exist, that's ok
        setRules([]);
      }

      // Optional: Try to fetch nomination periods if table exists
      try {
        const { data: periodsData } = await supabase
          .from('nomination_periods')
          .select('*')
          .eq('competition_id', competitionId)
          .order('period_order', { ascending: true });

        setNominationPeriods(periodsData || []);
      } catch {
        // Table may not exist, that's ok
        setNominationPeriods([]);
      }

    } catch (err) {
      console.error('Error fetching competition:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [citySlug, citySearchTerm, year, isDemoMode]);

  // Initial fetch
  useEffect(() => {
    fetchCompetition();
  }, [fetchCompetition]);

  // Compute phase
  const phase = useMemo(() => {
    return getCompetitionPhase(competition, votingRounds, nominationPeriods);
  }, [competition, votingRounds, nominationPeriods]);

  // Compute prize pool
  const prizePool = useMemo(() => {
    const minimum =
      competition?.prize_pool_minimum ||
      organization?.default_prize_minimum ||
      1000;
    const voteRevenue =
      phase.isVoting || phase.phase === 'results'
        ? calculateVoteRevenue(votes)
        : 0;
    return calculatePrizePool(minimum, voteRevenue);
  }, [competition, organization, votes, phase]);

  // Merge organization defaults with competition overrides
  const about = useMemo(() => {
    if (!competition && !organization) return null;

    return {
      tagline:
        competition?.about_tagline || organization?.default_about_tagline || '',
      description:
        competition?.about_description ||
        organization?.default_about_description ||
        competition?.description ||
        '',
      traits:
        competition?.about_traits || organization?.default_about_traits || [],
      ageRange:
        competition?.about_age_range || organization?.default_age_range || '21-35',
      requirement:
        competition?.about_requirement ||
        organization?.default_requirement ||
        'Single',
    };
  }, [competition, organization]);

  // Merge theme colors
  const theme = useMemo(() => {
    return {
      primary:
        competition?.theme_primary ||
        organization?.default_theme_primary ||
        '#d4af37',
      voting:
        competition?.theme_voting ||
        organization?.default_theme_voting ||
        '#f472b6',
      resurrection:
        competition?.theme_resurrection ||
        organization?.default_theme_resurrection ||
        '#8b5cf6',
    };
  }, [competition, organization]);

  // Get host info
  const host = useMemo(() => {
    if (!competition?.host_id) return null;
    return {
      id: competition.host_id,
    };
  }, [competition]);

  // Real-time subscription for votes during voting phases
  useEffect(() => {
    if (!competition?.id || !phase.isVoting || isDemoMode) return;

    const subscription = supabase
      .channel(`competition-${competition.id}-votes`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `competition_id=eq.${competition.id}`,
        },
        (payload) => {
          setVotes((prev) => [...prev, payload.new]);
          setContestants((prev) =>
            prev.map((c) => {
              if (c.id === payload.new.contestant_id) {
                return {
                  ...c,
                  votes: (c.votes || 0) + (payload.new.vote_count || 1),
                };
              }
              return c;
            })
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [competition?.id, phase.isVoting, isDemoMode]);

  // Real-time subscription for contestant updates
  useEffect(() => {
    if (!competition?.id || !phase.isVoting || isDemoMode) return;

    const subscription = supabase
      .channel(`competition-${competition.id}-contestants`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contestants',
          filter: `competition_id=eq.${competition.id}`,
        },
        (payload) => {
          setContestants((prev) =>
            prev.map((c) =>
              c.id === payload.new.id ? { ...c, ...payload.new } : c
            )
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [competition?.id, phase.isVoting, isDemoMode]);

  // Refetch function for manual refresh
  const refetch = useCallback(() => {
    fetchCompetition();
  }, [fetchCompetition]);

  return {
    // Core data
    competition,
    organization,
    contestants,
    sponsors,
    events,
    rules,
    votingRounds,
    nominationPeriods,
    announcements,

    // Computed values
    phase,
    prizePool,
    about,
    theme,
    host,

    // State
    loading,
    error,
    isDemoMode,

    // Actions
    refetch,
  };
}

export default useCompetitionPublic;
