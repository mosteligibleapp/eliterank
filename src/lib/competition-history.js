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
    const { data, error } = await supabase
      .from('competitions')
      .select(`
        id,
        name,
        city,
        season,
        status,
        phase,
        created_at,
        organization:organizations(id, name, slug)
      `)
      .eq('host_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching hosted competitions:', error);
      return [];
    }

    return (data || []).map(comp => ({
      id: comp.id,
      name: comp.name || `${comp.city} ${comp.season}`,
      city: comp.city,
      season: comp.season,
      status: comp.status,
      phase: comp.phase,
      createdAt: comp.created_at,
      role: 'host',
      organization: comp.organization,
    }));
  } catch (err) {
    console.error('Error in getHostedCompetitions:', err);
    return [];
  }
}

/**
 * Get all competitions a user is involved in (as contestant or host)
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

    // Mark contestant entries with role
    const contestantEntries = contestantHistory.map(entry => ({
      ...entry,
      role: 'contestant',
      competitionId: entry.competition?.id,
    }));

    // Mark hosted entries with competitionId for consistency
    const hostedEntries = hostedCompetitions.map(entry => ({
      ...entry,
      competitionId: entry.id,
    }));

    // Combine and sort by date (most recent first)
    const all = [...contestantEntries, ...hostedEntries];

    // Remove duplicates (in case user is both host and contestant in same competition)
    // Merge data from both roles when user has both
    const seen = new Map();
    all.forEach(entry => {
      const compId = entry.competitionId || entry.id;
      if (seen.has(compId)) {
        const existing = seen.get(compId);
        // Merge the two entries, keeping contestant data (votes, etc) and adding host flag
        if (entry.role === 'host' && existing.role === 'contestant') {
          seen.set(compId, {
            ...existing,
            isHost: true,
            alsoHost: true,
            organization: entry.organization || existing.organization,
          });
        } else if (entry.role === 'contestant' && existing.role === 'host') {
          seen.set(compId, {
            ...entry,
            role: 'host', // Primary role is host
            isHost: true,
            alsoContestant: true,
            organization: existing.organization || entry.organization,
          });
        }
      } else {
        seen.set(compId, {
          ...entry,
          isHost: entry.role === 'host',
        });
      }
    });

    // Return unique entries sorted by date
    return Array.from(seen.values()).sort((a, b) => {
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
    const { data, error } = await supabase
      .from('contestants')
      .select(`
        id,
        name,
        votes,
        avatar_url,
        status,
        created_at,
        competition_id,
        competitions (
          id,
          name,
          city,
          season,
          status,
          winners,
          phase
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching competition history:', error);
      return [];
    }

    // Process the data to add rank and winner status
    return (data || []).map(entry => {
      const competition = entry.competitions;
      const isWinner = competition?.winners?.includes(userId) || false;

      // Calculate placement (if competition has winners array)
      let placement = null;
      if (competition?.winners && Array.isArray(competition.winners)) {
        const winnerIndex = competition.winners.indexOf(userId);
        if (winnerIndex !== -1) {
          placement = winnerIndex + 1; // 1st place, 2nd place, etc.
        }
      }

      return {
        id: entry.id,
        name: entry.name,
        votes: entry.votes || 0,
        avatarUrl: entry.avatar_url,
        status: entry.status,
        createdAt: entry.created_at,
        isWinner,
        placement,
        competition: competition ? {
          id: competition.id,
          name: competition.name,
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
