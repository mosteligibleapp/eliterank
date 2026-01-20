import { supabase } from './supabase';

/**
 * Get competitions hosted by a user
 * @param {string} userId - The user's profile ID
 * @returns {Promise<Array>} - Array of hosted competitions
 */
export async function getHostedCompetitions(userId) {
  if (!supabase || !userId) {
    return [];
  }

  try {
    // Simple flat query - no joins (joins cause 400 errors in production)
    const { data, error } = await supabase
      .from('competitions')
      .select('id, city, season, status, phase, created_at')
      .eq('host_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching hosted competitions:', error);
      return [];
    }

    return (data || []).map(comp => ({
      id: comp.id,
      name: `${comp.city || 'Competition'} ${comp.season || ''}`.trim(),
      city: comp.city,
      season: comp.season,
      status: comp.status,
      phase: comp.phase,
      createdAt: comp.created_at,
      role: 'host',
    }));
  } catch (err) {
    console.error('Error in getHostedCompetitions:', err);
    return [];
  }
}

/**
 * Get all competitions a user is involved in (as contestant or host)
 * Users can be a host in one competition and contestant in another,
 * but not both roles in the same competition.
 * @param {string} userId - The user's profile ID
 * @returns {Promise<Array>} - Combined array of competitions with role indicator
 */
export async function getAllUserCompetitions(userId) {
  if (!supabase || !userId) {
    return [];
  }

  try {
    const [contestantHistory, hostedCompetitions] = await Promise.all([
      getCompetitionHistory(userId),
      getHostedCompetitions(userId),
    ]);

    // Mark contestant entries with role and extract competition ID
    const contestantEntries = contestantHistory.map(entry => ({
      ...entry,
      role: 'contestant',
      competitionId: entry.competition?.id,
    }));

    // Mark hosted entries with competitionId for consistency
    const hostedEntries = hostedCompetitions.map(entry => ({
      ...entry,
      competitionId: entry.id,
      isHost: true,
    }));

    // Combine all entries (users can't be both host and contestant in same competition)
    const all = [...contestantEntries, ...hostedEntries];

    // Sort by date (most recent first)
    return all.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });
  } catch (err) {
    console.error('Error in getAllUserCompetitions:', err);
    return [];
  }
}

/**
 * Get competition history for a user
 * @param {string} userId - The user's profile ID
 * @returns {Promise<Array>} - Array of competition entries with competition details
 */
export async function getCompetitionHistory(userId) {
  if (!supabase || !userId) {
    return [];
  }

  try {
    // Step 1: Get contestant entries for this user (no joins)
    const { data: contestants, error: contestantsError } = await supabase
      .from('contestants')
      .select('id, name, votes, avatar_url, status, created_at, competition_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (contestantsError) {
      console.error('Error fetching contestants:', contestantsError);
      return [];
    }

    if (!contestants || contestants.length === 0) {
      return [];
    }

    // Step 2: Get competition details for those entries
    const competitionIds = [...new Set(contestants.map(c => c.competition_id).filter(Boolean))];

    if (competitionIds.length === 0) {
      return contestants.map(entry => ({
        id: entry.id,
        name: entry.name,
        votes: entry.votes || 0,
        avatarUrl: entry.avatar_url,
        status: entry.status,
        createdAt: entry.created_at,
        isWinner: entry.status === 'winner',
        placement: entry.status === 'winner' ? 1 : null,
        competition: null,
      }));
    }

    const { data: competitions, error: competitionsError } = await supabase
      .from('competitions')
      .select('id, city, season, status, phase')
      .in('id', competitionIds);

    if (competitionsError) {
      console.error('Error fetching competitions:', competitionsError);
    }

    // Create a lookup map for competitions
    const competitionMap = new Map((competitions || []).map(c => [c.id, c]));

    // Step 3: Merge the data
    return contestants.map(entry => {
      const competition = competitionMap.get(entry.competition_id);
      const isWinner = entry.status === 'winner';

      return {
        id: entry.id,
        name: entry.name,
        votes: entry.votes || 0,
        avatarUrl: entry.avatar_url,
        status: entry.status,
        createdAt: entry.created_at,
        isWinner,
        placement: isWinner ? 1 : null,
        competition: competition ? {
          id: competition.id,
          city: competition.city,
          season: competition.season,
          status: competition.status,
          phase: competition.phase,
        } : null,
      };
    });
  } catch (err) {
    console.error('Error in getCompetitionHistory:', err);
    return [];
  }
}

/**
 * Get aggregated stats for a user's competition history
 * @param {string} userId - The user's profile ID
 * @returns {Promise<Object>} - Aggregated stats
 */
export async function getCompetitionStats(userId) {
  if (!supabase || !userId) {
    return {
      totalCompetitions: 0,
      totalVotes: 0,
      wins: 0,
      bestPlacement: null,
    };
  }

  try {
    // Get from profile if stats are already calculated
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('total_votes_received, total_competitions, wins, best_placement')
      .eq('id', userId)
      .single();

    if (!profileError && profile) {
      return {
        totalCompetitions: profile.total_competitions || 0,
        totalVotes: profile.total_votes_received || 0,
        wins: profile.wins || 0,
        bestPlacement: profile.best_placement,
      };
    }

    // Fallback: Calculate from contestants table
    const history = await getCompetitionHistory(userId);

    const totalVotes = history.reduce((sum, entry) => sum + (entry.votes || 0), 0);
    const wins = history.filter(entry => entry.isWinner).length;
    const placements = history.filter(entry => entry.placement).map(entry => entry.placement);
    const bestPlacement = placements.length > 0 ? Math.min(...placements) : null;

    return {
      totalCompetitions: history.length,
      totalVotes,
      wins,
      bestPlacement,
    };
  } catch (err) {
    console.error('Error in getCompetitionStats:', err);
    return {
      totalCompetitions: 0,
      totalVotes: 0,
      wins: 0,
      bestPlacement: null,
    };
  }
}

/**
 * Sync profile stats from contestants table (admin/maintenance function)
 * @param {string} userId - The user's profile ID
 */
export async function syncProfileStats(userId) {
  if (!supabase || !userId) {
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const history = await getCompetitionHistory(userId);

    const totalVotes = history.reduce((sum, entry) => sum + (entry.votes || 0), 0);
    const wins = history.filter(entry => entry.placement === 1).length;
    const placements = history.filter(entry => entry.placement).map(entry => entry.placement);
    const bestPlacement = placements.length > 0 ? Math.min(...placements) : null;

    const { error } = await supabase
      .from('profiles')
      .update({
        total_votes_received: totalVotes,
        total_competitions: history.length,
        wins,
        best_placement: bestPlacement,
      })
      .eq('id', userId);

    if (error) {
      console.error('Error syncing profile stats:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in syncProfileStats:', err);
    return { success: false, error: err.message };
  }
}
