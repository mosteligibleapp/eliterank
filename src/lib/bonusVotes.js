import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Bonus vote task keys - must match database task_key values
 */
export const BONUS_TASK_KEYS = {
  COMPLETE_PROFILE: 'complete_profile',
  ADD_PHOTO: 'add_photo',
  ADD_SOCIAL: 'add_social',
  VIEW_HOW_TO_WIN: 'view_how_to_win',
  SHARE_PROFILE: 'share_profile',
};

/**
 * Deprecated task keys - filtered out on the frontend.
 * "add_bio" is redundant since "complete_profile" already requires a bio.
 */
export const DEPRECATED_TASK_KEYS = new Set(['add_bio']);

/**
 * Setup default bonus vote tasks for a competition
 * Called when a competition is created or when an admin enables bonus votes
 */
export async function setupDefaultBonusTasks(competitionId) {
  if (!supabase || !competitionId) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const { error } = await supabase.rpc('setup_default_bonus_tasks', {
      p_competition_id: competitionId,
    });

    if (error) {
      console.error('Error setting up bonus tasks:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error setting up bonus tasks:', err);
    return { success: false, error: 'Failed to setup bonus tasks' };
  }
}

/**
 * Get bonus vote tasks and completion status for a contestant
 */
export async function getBonusVoteStatus(competitionId, contestantId) {
  if (!supabase || !competitionId || !contestantId) {
    return { tasks: [], error: null };
  }

  try {
    const { data, error } = await supabase.rpc('get_bonus_vote_status', {
      p_competition_id: competitionId,
      p_contestant_id: contestantId,
    });

    if (error) {
      console.error('Error getting bonus vote status:', error);
      return { tasks: [], error: error.message };
    }

    return { tasks: data || [], error: null };
  } catch (err) {
    console.error('Error getting bonus vote status:', err);
    return { tasks: [], error: 'Failed to get bonus vote status' };
  }
}

/**
 * Award bonus votes for completing a task
 * Idempotent - won't double-award
 */
export async function awardBonusVotes(competitionId, contestantId, userId, taskKey) {
  if (!supabase || !competitionId || !contestantId || !taskKey) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const { data, error } = await supabase.rpc('award_bonus_votes', {
      p_competition_id: competitionId,
      p_contestant_id: contestantId,
      p_user_id: userId || null,
      p_task_key: taskKey,
    });

    if (error) {
      console.error('Error awarding bonus votes:', error);
      return { success: false, error: error.message };
    }

    return data || { success: false, error: 'No response' };
  } catch (err) {
    console.error('Error awarding bonus votes:', err);
    return { success: false, error: 'Failed to award bonus votes' };
  }
}

/**
 * Get bonus vote tasks for a competition (admin view)
 */
export async function getBonusVoteTasks(competitionId) {
  if (!supabase || !competitionId) {
    return { tasks: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('bonus_vote_tasks')
      .select('*')
      .eq('competition_id', competitionId)
      .order('sort_order');

    if (error) {
      console.error('Error fetching bonus vote tasks:', error);
      return { tasks: [], error: error.message };
    }

    return { tasks: data || [], error: null };
  } catch (err) {
    console.error('Error fetching bonus vote tasks:', err);
    return { tasks: [], error: 'Failed to fetch bonus vote tasks' };
  }
}

/**
 * Update a bonus vote task (admin)
 */
export async function updateBonusVoteTask(taskId, updates) {
  if (!supabase || !taskId) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const { error } = await supabase
      .from('bonus_vote_tasks')
      .update(updates)
      .eq('id', taskId);

    if (error) {
      console.error('Error updating bonus vote task:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error updating bonus vote task:', err);
    return { success: false, error: 'Failed to update task' };
  }
}

/**
 * Get completion stats for a competition (admin view)
 */
export async function getBonusVoteCompletionStats(competitionId) {
  if (!supabase || !competitionId) {
    return { stats: null, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('bonus_vote_completions')
      .select('task_id, votes_awarded')
      .eq('competition_id', competitionId);

    if (error) {
      console.error('Error fetching completion stats:', error);
      return { stats: null, error: error.message };
    }

    // Aggregate stats
    const completions = data || [];
    const totalBonusVotes = completions.reduce((sum, c) => sum + c.votes_awarded, 0);
    const completionsByTask = completions.reduce((acc, c) => {
      acc[c.task_id] = (acc[c.task_id] || 0) + 1;
      return acc;
    }, {});

    return {
      stats: {
        totalCompletions: completions.length,
        totalBonusVotes,
        completionsByTask,
      },
      error: null,
    };
  } catch (err) {
    console.error('Error fetching completion stats:', err);
    return { stats: null, error: 'Failed to fetch stats' };
  }
}

/**
 * Check profile completeness and auto-award applicable bonus votes
 * Call this after profile updates to check if any new tasks are completed
 */
export async function checkAndAwardProfileBonuses(competitionId, contestantId, userId, profile) {
  if (!competitionId || !contestantId || !profile) return [];

  const awarded = [];

  // Check complete_profile: has name, bio, city, and age
  const hasName = !!(profile.first_name || profile.name);
  const hasBio = !!(profile.bio && profile.bio.length > 0);
  const hasCity = !!(profile.city && profile.city.length > 0);
  const hasAge = !!(profile.age && profile.age > 0);

  if (hasName && hasBio && hasCity && hasAge) {
    const result = await awardBonusVotes(competitionId, contestantId, userId, BONUS_TASK_KEYS.COMPLETE_PROFILE);
    if (result.success) awarded.push(result);
  }

  // Check add_photo: has avatar_url
  if (profile.avatar_url) {
    const result = await awardBonusVotes(competitionId, contestantId, userId, BONUS_TASK_KEYS.ADD_PHOTO);
    if (result.success) awarded.push(result);
  }

  // Check add_social: has at least one social link
  const hasSocial = !!(profile.instagram || profile.twitter || profile.tiktok || profile.linkedin);
  if (hasSocial) {
    const result = await awardBonusVotes(competitionId, contestantId, userId, BONUS_TASK_KEYS.ADD_SOCIAL);
    if (result.success) awarded.push(result);
  }

  return awarded;
}
