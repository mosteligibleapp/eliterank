import { supabase } from './supabase';

// =============================================================================
// Video Prompt CRUD (Host)
// =============================================================================

/**
 * Create a video prompt for a competition
 */
export async function createVideoPrompt(competitionId, { promptText, description, dueDate, createdBy, votesAwarded }) {
  if (!supabase || !competitionId || !promptText) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const { data: existing } = await supabase
      .from('video_prompts')
      .select('sort_order')
      .eq('competition_id', competitionId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSort = (existing?.[0]?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('video_prompts')
      .insert({
        competition_id: competitionId,
        created_by: createdBy || null,
        prompt_text: promptText,
        description: description || null,
        due_date: dueDate || null,
        votes_awarded: votesAwarded || 0,
        sort_order: nextSort,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating video prompt:', error);
      return { success: false, error: error.message };
    }

    return { success: true, prompt: data };
  } catch (err) {
    console.error('Error creating video prompt:', err);
    return { success: false, error: 'Failed to create video prompt' };
  }
}

/**
 * Get all video prompts for a competition (host view)
 */
export async function getVideoPrompts(competitionId) {
  if (!supabase || !competitionId) {
    return { prompts: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('video_prompts')
      .select('*')
      .eq('competition_id', competitionId)
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error fetching video prompts:', error);
      return { prompts: [], error: error.message };
    }

    return { prompts: data || [], error: null };
  } catch (err) {
    console.error('Error fetching video prompts:', err);
    return { prompts: [], error: 'Failed to fetch video prompts' };
  }
}

/**
 * Get video prompts with response status for a contestant
 */
export async function getVideoPromptsForContestant(competitionId, contestantId) {
  if (!supabase || !competitionId || !contestantId) {
    return { prompts: [], error: null };
  }

  try {
    // Get all active prompts for this competition
    const { data: prompts, error: pErr } = await supabase
      .from('video_prompts')
      .select('*')
      .eq('competition_id', competitionId)
      .eq('is_active', true)
      .order('sort_order');

    if (pErr) throw pErr;

    // Get this contestant's responses
    const { data: responses, error: rErr } = await supabase
      .from('video_prompt_responses')
      .select('*')
      .eq('competition_id', competitionId)
      .eq('contestant_id', contestantId);

    if (rErr) throw rErr;

    const responseMap = {};
    for (const r of (responses || [])) {
      responseMap[r.prompt_id] = r;
    }

    const result = (prompts || []).map(p => ({
      ...p,
      response: responseMap[p.id] || null,
    }));

    return { prompts: result, error: null };
  } catch (err) {
    console.error('Error fetching video prompts for contestant:', err);
    return { prompts: [], error: 'Failed to fetch video prompts' };
  }
}

/**
 * Delete a video prompt
 */
export async function deleteVideoPrompt(promptId) {
  if (!supabase || !promptId) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const { error } = await supabase
      .from('video_prompts')
      .delete()
      .eq('id', promptId);

    if (error) {
      console.error('Error deleting video prompt:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error deleting video prompt:', err);
    return { success: false, error: 'Failed to delete video prompt' };
  }
}

// =============================================================================
// Video Response Submission (Contestant)
// =============================================================================

/**
 * Submit a video response to a prompt
 */
export async function submitVideoResponse(promptId, competitionId, contestantId, userId, videoUrl, durationSeconds) {
  if (!supabase || !promptId || !competitionId || !contestantId || !videoUrl) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const { data, error } = await supabase.rpc('submit_video_response', {
      p_prompt_id: promptId,
      p_competition_id: competitionId,
      p_contestant_id: contestantId,
      p_user_id: userId || null,
      p_video_url: videoUrl,
      p_duration_seconds: durationSeconds || null,
    });

    if (error) {
      console.error('Error submitting video response:', error);
      return { success: false, error: error.message };
    }

    return data || { success: false, error: 'No response' };
  } catch (err) {
    console.error('Error submitting video response:', err);
    return { success: false, error: 'Failed to submit video response' };
  }
}

// =============================================================================
// Video Response Review (Host)
// =============================================================================

/**
 * Get all responses for a competition (host review)
 */
export async function getVideoResponses(competitionId) {
  if (!supabase || !competitionId) {
    return { responses: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('video_prompt_responses')
      .select(`
        *,
        prompt:video_prompts(prompt_text),
        contestant:contestants(name, avatar_url, user_id)
      `)
      .eq('competition_id', competitionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching video responses:', error);
      return { responses: [], error: error.message };
    }

    return { responses: data || [], error: null };
  } catch (err) {
    console.error('Error fetching video responses:', err);
    return { responses: [], error: 'Failed to fetch video responses' };
  }
}

/**
 * Approve or reject a video response
 */
export async function reviewVideoResponse(responseId, reviewerId, action, rejectionReason) {
  if (!supabase || !responseId || !reviewerId || !action) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const { data, error } = await supabase.rpc('review_video_response', {
      p_response_id: responseId,
      p_reviewer_id: reviewerId,
      p_action: action,
      p_rejection_reason: rejectionReason || null,
    });

    if (error) {
      console.error('Error reviewing video response:', error);
      return { success: false, error: error.message };
    }

    return data || { success: false, error: 'No response' };
  } catch (err) {
    console.error('Error reviewing video response:', err);
    return { success: false, error: 'Failed to review video response' };
  }
}

// =============================================================================
// Notifications
// =============================================================================

/**
 * Notify all contestants in a competition about a new video prompt
 */
export async function notifyContestantsOfPrompt(competitionId, promptText) {
  if (!supabase || !competitionId) return;

  try {
    // Get all contestants with user_id in this competition
    const { data: contestants } = await supabase
      .from('contestants')
      .select('user_id')
      .eq('competition_id', competitionId)
      .not('user_id', 'is', null);

    if (!contestants?.length) return;

    const notifications = contestants.map(c => ({
      user_id: c.user_id,
      type: 'video_prompt',
      title: 'New video prompt',
      body: promptText.length > 80 ? promptText.slice(0, 80) + '...' : promptText,
      competition_id: competitionId,
      action_url: '/profile',
    }));

    await supabase.from('notifications').insert(notifications).catch(() => {});
  } catch (err) {
    console.warn('Failed to notify contestants of video prompt:', err);
  }
}

/**
 * Notify the host that a contestant submitted a video response
 */
export async function notifyHostOfResponse(competitionId, contestantName, promptText) {
  if (!supabase || !competitionId) return;

  try {
    // Get host user_id
    const { data: comp } = await supabase
      .from('competitions')
      .select('host_id')
      .eq('id', competitionId)
      .single();

    if (!comp?.host_id) return;

    await supabase.from('notifications').insert({
      user_id: comp.host_id,
      type: 'video_response',
      title: 'New video response',
      body: `${contestantName} responded to: ${promptText?.length > 60 ? promptText.slice(0, 60) + '...' : promptText}`,
      competition_id: competitionId,
      action_url: '/dashboard',
    }).catch(() => {});
  } catch (err) {
    console.warn('Failed to notify host of video response:', err);
  }
}
