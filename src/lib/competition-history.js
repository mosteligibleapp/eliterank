import { supabase } from './supabase';

/**
 * Get nominations for a user (by user_id or email)
 * Returns nominations that haven't been converted to contestant yet
 */
export async function getNominationsForUser(userId, userEmail) {
  if (!supabase || (!userId && !userEmail)) return [];

  try {
    let query = supabase
      .from('nominees')
      .select(`
        id,
        name,
        email,
        status,
        claimed_at,
        user_id,
        nominator_name,
        nominator_anonymous,
        nomination_reason,
        invite_token,
        competition:competitions(
          id,
          name,
          slug,
          season,
          status,
          city:cities(name),
          organization:organizations(name, slug)
        )
      `)
      .not('status', 'in', '("rejected","declined")')
      .or('converted_to_contestant.is.null,converted_to_contestant.eq.false')
      .order('created_at', { ascending: false });

    // Filter by user_id OR email
    if (userId && userEmail) {
      query = query.or(`user_id.eq.${userId},email.eq.${userEmail}`);
    } else if (userId) {
      query = query.eq('user_id', userId);
    } else if (userEmail) {
      query = query.eq('email', userEmail);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching nominations:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getNominationsForUser:', err);
    return [];
  }
}

/**
 * Get competitions hosted by a user
 */
export async function getHostedCompetitions(userId) {
  if (!supabase || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('competitions')
      .select('*, city:cities(name), organization:organizations(slug)')
      .eq('host_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching hosted competitions:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Error in getHostedCompetitions:', err);
    return [];
  }
}

/**
 * Get competitions where user was a contestant
 */
export async function getContestantCompetitions(userId) {
  if (!supabase || !userId) return [];

  try {
    // Get contestant entries
    const { data: contestants, error: contestantsError } = await supabase
      .from('contestants')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (contestantsError || !contestants?.length) {
      if (contestantsError) console.error('Error fetching contestants:', contestantsError);
      return [];
    }

    // Get competition details
    const competitionIds = [...new Set(contestants.map(c => c.competition_id).filter(Boolean))];
    if (!competitionIds.length) return [];

    const { data: competitions, error: competitionsError } = await supabase
      .from('competitions')
      .select('*, city:cities(name), organization:organizations(slug)')
      .in('id', competitionIds);

    if (competitionsError) {
      console.error('Error fetching competitions:', competitionsError);
      return [];
    }

    // Merge contestant data with competition data
    const competitionMap = new Map((competitions || []).map(c => [c.id, c]));

    return contestants.map(contestant => ({
      ...contestant,
      competition: competitionMap.get(contestant.competition_id) || null,
    }));
  } catch (err) {
    console.error('Error in getContestantCompetitions:', err);
    return [];
  }
}

/**
 * Get aggregated stats for a user (reads from profile)
 */
export async function getCompetitionStats(userId) {
  const defaultStats = { totalCompetitions: 0, totalVotes: 0, wins: 0, bestPlacement: null };

  if (!supabase || !userId) return defaultStats;

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('total_votes_received, total_competitions, wins, best_placement')
      .eq('id', userId)
      .single();

    if (error || !profile) return defaultStats;

    return {
      totalCompetitions: profile.total_competitions || 0,
      totalVotes: profile.total_votes_received || 0,
      wins: profile.wins || 0,
      bestPlacement: profile.best_placement,
    };
  } catch (err) {
    console.error('Error in getCompetitionStats:', err);
    return defaultStats;
  }
}
