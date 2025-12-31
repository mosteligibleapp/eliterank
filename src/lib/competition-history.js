import { supabase } from './supabase';

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
