import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getCompetitionPhase } from '../utils/getCompetitionPhase';
import {
  calculatePrizePool,
  calculateVoteRevenue,
} from '../utils/calculatePrizePool';

/**
 * Fetch public competition data by org slug, city slug, optional year, and optional demographic
 *
 * @param {string} orgSlug - Organization slug (e.g., 'most-eligible')
 * @param {string} citySlug - City slug (e.g., 'chicago')
 * @param {string|number} year - Optional year (e.g., '2026')
 * @param {string} demographicSlug - Optional demographic slug (e.g., 'women-21-39')
 * @returns {object} Competition data, phase info, loading state, and helpers
 */
export function useCompetitionPublic(orgSlug, citySlug, year = null, demographicSlug = null) {
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

  // Fetch competition data
  const fetchCompetition = useCallback(async () => {
    if (!orgSlug || !citySlug) {
      setError(new Error('Missing org or city slug'));
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
      // First, get the organization by slug
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', orgSlug)
        .single();

      if (orgError) throw orgError;
      if (!orgData) throw new Error('Organization not found');

      setOrganization(orgData);

      // Lookup city by slug from cities table
      // Use maybeSingle() to gracefully handle 0 results (returns null instead of 406 error)
      let cityData = null;
      const { data: cityResult } = await supabase
        .from('cities')
        .select('id, name, slug, state')
        .eq('slug', citySlug)
        .maybeSingle();

      if (!cityResult) {
        // Fallback: try pattern matching on slug
        const { data: cityFallback } = await supabase
          .from('cities')
          .select('id, name, slug, state')
          .ilike('slug', `%${citySlug}%`)
          .limit(1)
          .maybeSingle();

        if (!cityFallback) {
          throw new Error('City not found');
        }
        cityData = cityFallback;
      } else {
        cityData = cityResult;
      }

      // Lookup demographic if provided
      let demographicId = null;
      if (demographicSlug) {
        const { data: demoData } = await supabase
          .from('demographics')
          .select('id')
          .eq('slug', demographicSlug)
          .maybeSingle();
        demographicId = demoData?.id;
      } else {
        // Default to 'open' demographic if no demographic specified
        const { data: openDemo } = await supabase
          .from('demographics')
          .select('id')
          .eq('slug', 'open')
          .maybeSingle();
        demographicId = openDemo?.id;
      }

      // Build competition query using city_id for accurate lookup
      let query = supabase
        .from('competitions')
        .select(
          `
          *,
          city:cities(*),
          category:categories(*),
          demographic:demographics(*),
          host:profiles!competitions_host_id_fkey (
            id,
            first_name,
            last_name,
            bio,
            avatar_url,
            city,
            instagram,
            twitter,
            linkedin
          ),
          contestants (
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
          ),
          sponsors (
            id,
            name,
            tier,
            amount,
            logo_url,
            website_url,
            sort_order
          ),
          events (
            id,
            name,
            date,
            end_date,
            time,
            location,
            status,
            public_visible,
            is_double_vote_day,
            sort_order
          ),
          competition_rules (
            id,
            section_title,
            section_content,
            sort_order
          ),
          voting_rounds (
            id,
            title,
            round_order,
            start_date,
            end_date,
            contestants_advance,
            votes_accumulate,
            round_type
          ),
          nomination_periods (
            id,
            title,
            period_order,
            start_date,
            end_date,
            max_submissions
          ),
          announcements (
            id,
            type,
            title,
            content,
            pinned,
            published_at,
            is_ai_generated
          )
        `
        )
        .eq('organization_id', orgData.id)
        .eq('city_id', cityData.id);

      // Filter by demographic if we found one
      if (demographicId) {
        query = query.eq('demographic_id', demographicId);
      }

      // Filter by year if provided
      if (year) {
        // Assuming slug format is 'city-year' or filtering by season field
        query = query.or(`slug.ilike.%${year}%,season.eq.${year}`);
      }

      // Order by most recent and get first match
      // Use maybeSingle() to gracefully handle 0 results (returns null instead of error)
      query = query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let { data: compData, error: compError } = await query;

      // Fallback: if no competition found by city_id, try legacy city string matching
      // This handles cases where city_id wasn't properly set in the database
      if (!compData && !compError) {
        const cityPattern = `%${citySlug.split('-').join('%')}%`;
        let fallbackQuery = supabase
          .from('competitions')
          .select(
            `
            *,
            city:cities(*),
            host:profiles!competitions_host_id_fkey (
              id,
              first_name,
              last_name,
              bio,
              avatar_url,
              city,
              instagram,
              twitter,
              linkedin
            ),
            contestants (
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
            ),
            sponsors (
              id,
              name,
              tier,
              amount,
              logo_url,
              website_url,
              sort_order
            ),
            events (
              id,
              name,
              date,
              end_date,
              time,
              location,
              status,
              public_visible,
              is_double_vote_day,
              sort_order
            ),
            competition_rules (
              id,
              section_title,
              section_content,
              sort_order
            ),
            voting_rounds (
              id,
              title,
              round_order,
              start_date,
              end_date,
              contestants_advance,
              votes_accumulate,
              round_type
            ),
            nomination_periods (
              id,
              title,
              period_order,
              start_date,
              end_date,
              max_submissions
            ),
            announcements (
              id,
              type,
              title,
              content,
              pinned,
              published_at,
              is_ai_generated
            )
          `
          )
          .eq('organization_id', orgData.id)
          .ilike('city', cityPattern);

        if (year) {
          fallbackQuery = fallbackQuery.or(`slug.ilike.%${year}%,season.eq.${year}`);
        }

        fallbackQuery = fallbackQuery
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const fallbackResult = await fallbackQuery;
        compData = fallbackResult.data;
        compError = fallbackResult.error;
      }

      if (compError) throw compError;
      if (!compData) throw new Error('Competition not found');

      // Normalize city to string for rendering, keep full object as cityData
      const cityObj = compData.city;
      const normalizedCompData = {
        ...compData,
        city: typeof cityObj === 'object' ? cityObj?.name : cityObj || 'Unknown City',
        cityData: typeof cityObj === 'object' ? cityObj : null,
      };

      // Set all state
      setCompetition(normalizedCompData);
      setContestants(compData.contestants || []);
      setSponsors(
        (compData.sponsors || []).sort(
          (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
        )
      );
      setEvents(
        (compData.events || [])
          .filter((e) => e.public_visible !== false)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
      );
      setRules(
        (compData.competition_rules || []).sort(
          (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
        )
      );
      setVotingRounds(
        (compData.voting_rounds || []).sort(
          (a, b) => (a.round_order || 0) - (b.round_order || 0)
        )
      );
      setNominationPeriods(
        (compData.nomination_periods || []).sort(
          (a, b) => (a.period_order || 0) - (b.period_order || 0)
        )
      );
      setAnnouncements(
        (compData.announcements || [])
          .filter((a) => a.published_at)
          .sort((a, b) => {
            // Pinned first, then by date
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.published_at) - new Date(a.published_at);
          })
      );

      // Fetch vote revenue separately (aggregate)
      const { data: voteData } = await supabase
        .from('votes')
        .select('amount_paid')
        .eq('competition_id', compData.id);

      setVotes(voteData || []);
    } catch (err) {
      console.error('Error fetching competition:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, citySlug, year, demographicSlug, isDemoMode]);

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
        '',
      traits:
        competition?.about_traits || organization?.default_about_traits || [],
      ageRange:
        competition?.about_age_range || organization?.default_age_range || '',
      requirement:
        competition?.about_requirement ||
        organization?.default_requirement ||
        '',
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
    // Host data should be joined or fetched separately
    // For now, return basic structure
    return {
      id: competition.host_id,
      // Additional host data would come from profiles table
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
          // Add new vote to state
          setVotes((prev) => [...prev, payload.new]);

          // Update contestant vote count
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
