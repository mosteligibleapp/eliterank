import { useState, useEffect, useCallback, useMemo } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  getBonusVoteStatus,
  awardBonusVotes,
  checkAndAwardProfileBonuses,
  BONUS_TASK_KEYS,
} from '../lib/bonusVotes';

/**
 * Hook for managing bonus votes for a contestant
 *
 * @param {string} competitionId - Competition UUID
 * @param {string} contestantId - Contestant UUID
 * @param {string} userId - The contestant's user profile UUID
 * @returns {object} Bonus vote tasks, status, and actions
 */
export function useBonusVotes(competitionId, contestantId, userId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState(null); // task_key currently being awarded

  const isDemoMode = !isSupabaseConfigured();

  // Fetch bonus vote status
  const fetchStatus = useCallback(async () => {
    if (!competitionId || !contestantId || isDemoMode) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { tasks: fetchedTasks } = await getBonusVoteStatus(competitionId, contestantId);
    setTasks(fetchedTasks);
    setLoading(false);
  }, [competitionId, contestantId, isDemoMode]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Award a single bonus vote task
  const awardTask = useCallback(async (taskKey) => {
    if (!competitionId || !contestantId || isDemoMode) return null;

    setAwarding(taskKey);
    const result = await awardBonusVotes(competitionId, contestantId, userId, taskKey);

    if (result.success) {
      // Optimistically mark as completed
      setTasks(prev => prev.map(t =>
        t.task_key === taskKey
          ? { ...t, completed: true, completed_at: new Date().toISOString() }
          : t
      ));
    }

    setAwarding(null);
    return result;
  }, [competitionId, contestantId, userId, isDemoMode]);

  // Check profile and auto-award applicable tasks
  const checkProfile = useCallback(async (profile) => {
    if (!competitionId || !contestantId || !profile || isDemoMode) return [];

    const awarded = await checkAndAwardProfileBonuses(
      competitionId, contestantId, userId, profile
    );

    if (awarded.length > 0) {
      // Refresh to get updated status
      await fetchStatus();
    }

    return awarded;
  }, [competitionId, contestantId, userId, isDemoMode, fetchStatus]);

  // Mark "view how to win" as completed
  const markHowToWinViewed = useCallback(async () => {
    return awardTask(BONUS_TASK_KEYS.VIEW_HOW_TO_WIN);
  }, [awardTask]);

  // Mark "share profile" as completed
  const markProfileShared = useCallback(async () => {
    return awardTask(BONUS_TASK_KEYS.SHARE_PROFILE);
  }, [awardTask]);

  // Computed values
  const completedCount = useMemo(() => tasks.filter(t => t.completed).length, [tasks]);
  const totalCount = useMemo(() => tasks.length, [tasks]);
  const totalBonusVotesEarned = useMemo(
    () => tasks.filter(t => t.completed).reduce((sum, t) => sum + t.votes_awarded, 0),
    [tasks]
  );
  const totalBonusVotesAvailable = useMemo(
    () => tasks.reduce((sum, t) => sum + t.votes_awarded, 0),
    [tasks]
  );
  const allCompleted = useMemo(
    () => totalCount > 0 && completedCount === totalCount,
    [completedCount, totalCount]
  );
  const progress = useMemo(
    () => totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
    [completedCount, totalCount]
  );

  return {
    tasks,
    loading,
    awarding,

    // Actions
    awardTask,
    checkProfile,
    markHowToWinViewed,
    markProfileShared,
    refetch: fetchStatus,

    // Computed
    completedCount,
    totalCount,
    totalBonusVotesEarned,
    totalBonusVotesAvailable,
    allCompleted,
    progress,
  };
}

export default useBonusVotes;
