import { supabase } from './supabase';

/**
 * Resurrection-by-the-public client API.
 *
 * An admin opens a resurrection poll for a competition; eliminated top-25
 * contestants become candidates; the public votes; the admin closes the poll
 * and the leading candidate is returned to the competition. All reads and
 * writes go through SECURITY DEFINER RPCs (see migration 064).
 */

/**
 * Fetch the current resurrection poll for a competition (open, or the most
 * recent closed one) with per-candidate vote tallies.
 *
 * @param {string} competitionId
 * @returns {Promise<{poll: object|null, candidates: object[], myVoteContestantId: string|null, error?: string}>}
 */
export async function getResurrectionPoll(competitionId) {
  const empty = { poll: null, candidates: [], myVoteContestantId: null };
  if (!supabase || !competitionId) return empty;

  const { data, error } = await supabase.rpc('get_resurrection_poll', {
    p_competition_id: competitionId,
  });

  if (error) {
    console.warn('getResurrectionPoll failed:', error.message);
    return { ...empty, error: error.message };
  }

  return {
    poll: data?.poll || null,
    candidates: data?.candidates || [],
    myVoteContestantId: data?.my_vote_contestant_id || null,
  };
}

/**
 * Cast a public vote for a candidate in a resurrection poll.
 * One vote per signed-in voter per poll.
 *
 * @param {string} pollId
 * @param {string} contestantId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function castResurrectionVote(pollId, contestantId) {
  if (!supabase) return { success: false, error: 'Database not configured' };
  if (!pollId || !contestantId) {
    return { success: false, error: 'Missing required parameters' };
  }

  const { data, error } = await supabase.rpc('cast_resurrection_vote', {
    p_poll_id: pollId,
    p_contestant_id: contestantId,
  });

  if (error) {
    return { success: false, error: error.message || 'Could not record your vote' };
  }
  return { success: true, data };
}

/**
 * Open a resurrection poll (admin only — enforced server-side).
 *
 * @param {string} competitionId
 * @returns {Promise<{success: boolean, candidateCount?: number, error?: string}>}
 */
export async function openResurrectionPoll(competitionId) {
  if (!supabase) return { success: false, error: 'Database not configured' };
  if (!competitionId) return { success: false, error: 'Missing competition' };

  const { data, error } = await supabase.rpc('open_resurrection_poll', {
    p_competition_id: competitionId,
  });

  if (error) {
    return { success: false, error: error.message || 'Could not open the resurrection poll' };
  }
  return { success: true, candidateCount: data?.candidate_count ?? 0, pollId: data?.poll_id };
}

/**
 * Close a resurrection poll and resurrect the winning candidate (admin only).
 *
 * @param {string} pollId
 * @returns {Promise<{success: boolean, winnerContestantId?: string|null, winnerVotes?: number, error?: string}>}
 */
export async function closeResurrectionPoll(pollId) {
  if (!supabase) return { success: false, error: 'Database not configured' };
  if (!pollId) return { success: false, error: 'Missing poll' };

  const { data, error } = await supabase.rpc('close_resurrection_poll', {
    p_poll_id: pollId,
  });

  if (error) {
    return { success: false, error: error.message || 'Could not close the resurrection poll' };
  }
  return {
    success: true,
    winnerContestantId: data?.winner_contestant_id ?? null,
    winnerVotes: data?.winner_votes ?? 0,
  };
}
