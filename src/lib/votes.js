import { supabase } from './supabase';

/**
 * Check if user has used their free vote today for this competition
 * @param {string} userId - The user's ID
 * @param {string} competitionId - The competition ID
 * @returns {Promise<boolean>} - True if already voted today
 */
export async function hasUsedFreeVoteToday(userId, competitionId) {
  if (!supabase || !userId || !competitionId) {
    return false;
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('votes')
      .select('id')
      .eq('voter_id', userId)
      .eq('competition_id', competitionId)
      .eq('amount_paid', 0) // Free votes only
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`)
      .limit(1);

    if (error) {
      console.error('Error checking daily vote:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (err) {
    console.error('Error checking free vote status:', err);
    return false;
  }
}

/**
 * Get the contestant ID that user voted for today (if any)
 * @param {string} userId - The user's ID
 * @param {string} competitionId - The competition ID
 * @returns {Promise<string|null>} - The contestant ID or null
 */
export async function getTodaysVote(userId, competitionId) {
  if (!supabase || !userId || !competitionId) {
    return null;
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('votes')
      .select('contestant_id')
      .eq('voter_id', userId)
      .eq('competition_id', competitionId)
      .eq('amount_paid', 0)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting today\'s vote:', error);
      return null;
    }

    return data?.contestant_id || null;
  } catch (err) {
    console.error('Error getting today\'s vote:', err);
    return null;
  }
}

/**
 * Submit a free daily vote
 * @param {Object} params - Vote parameters
 * @param {string} params.userId - The user's ID
 * @param {string} params.voterEmail - The voter's email
 * @param {string} params.competitionId - The competition ID
 * @param {string} params.contestantId - The contestant ID to vote for
 * @param {boolean} params.isDoubleVoteDay - Whether votes count double today
 * @returns {Promise<{success: boolean, error?: string, votesAdded?: number}>}
 */
export async function submitFreeVote({
  userId,
  voterEmail,
  competitionId,
  contestantId,
  isDoubleVoteDay = false,
}) {
  if (!supabase) {
    return { success: false, error: 'Database not configured' };
  }

  if (!userId || !competitionId || !contestantId) {
    return { success: false, error: 'Missing required parameters' };
  }

  const voteValue = isDoubleVoteDay ? 2 : 1;

  try {
    // 1. Check if already voted today (prevent race condition)
    const alreadyVoted = await hasUsedFreeVoteToday(userId, competitionId);
    if (alreadyVoted) {
      return { success: false, error: 'You have already used your free vote today' };
    }

    // 2. Insert the vote record
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        voter_id: userId,
        voter_email: voterEmail || null,
        competition_id: competitionId,
        contestant_id: contestantId,
        vote_count: voteValue,
        amount_paid: 0,
        payment_intent_id: null,
        is_double_vote: isDoubleVoteDay,
      });

    if (voteError) {
      console.error('Vote insert error:', voteError);
      // Check for unique constraint violation
      if (voteError.code === '23505') {
        return { success: false, error: 'You have already used your free vote today' };
      }
      return { success: false, error: voteError.message };
    }

    // 3. Increment contestant's vote count using RPC (atomic operation)
    const { error: updateError } = await supabase.rpc('increment_contestant_votes', {
      p_contestant_id: contestantId,
      p_vote_count: voteValue,
    });

    if (updateError) {
      // Fallback to manual update if RPC doesn't exist
      console.warn('RPC increment_contestant_votes failed, using fallback:', updateError);

      // Get current votes and update
      const { data: contestant, error: fetchError } = await supabase
        .from('contestants')
        .select('votes, user_id')
        .eq('id', contestantId)
        .single();

      if (fetchError) {
        console.error('Error fetching contestant:', fetchError);
        // Vote was recorded but count update failed
        return { success: true, votesAdded: voteValue, warning: 'Vote recorded but count may be delayed' };
      }

      const { error: manualUpdateError } = await supabase
        .from('contestants')
        .update({ votes: (contestant.votes || 0) + voteValue })
        .eq('id', contestantId);

      if (manualUpdateError) {
        console.error('Error updating contestant votes:', manualUpdateError);
        return { success: true, votesAdded: voteValue, warning: 'Vote recorded but count may be delayed' };
      }

      // Update profile stats if contestant is linked to a profile
      if (contestant.user_id) {
        await updateProfileVotes(contestant.user_id, voteValue);
      }
    } else {
      // RPC succeeded, now update profile stats
      // Get contestant's user_id to update their profile stats
      const { data: contestant } = await supabase
        .from('contestants')
        .select('user_id')
        .eq('id', contestantId)
        .single();

      if (contestant?.user_id) {
        await updateProfileVotes(contestant.user_id, voteValue);
      }
    }

    return { success: true, votesAdded: voteValue };
  } catch (err) {
    console.error('Error submitting vote:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update profile's total votes received
 * @param {string} userId - The profile's user ID
 * @param {number} voteValue - Number of votes to add
 */
async function updateProfileVotes(userId, voteValue) {
  if (!supabase || !userId) return;

  try {
    // Try RPC first
    const { error } = await supabase.rpc('increment_profile_votes', {
      p_user_id: userId,
      p_votes: voteValue,
    });

    if (error) {
      // Fallback to manual update
      console.warn('RPC increment_profile_votes failed, using fallback:', error);

      const { data: profile } = await supabase
        .from('profiles')
        .select('total_votes_received')
        .eq('id', userId)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            total_votes_received: (profile.total_votes_received || 0) + voteValue,
          })
          .eq('id', userId);
      }
    }
  } catch (err) {
    console.error('Error updating profile votes:', err);
    // Non-critical, don't fail the vote
  }
}

/**
 * Get time until free vote resets (midnight local time)
 * @returns {string} - Human readable time until reset
 */
export function getTimeUntilReset() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const diff = midnight - now;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
