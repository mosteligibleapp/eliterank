import { useState, useEffect, useRef } from 'react';
import { getContestantCompetitions } from '../../../lib/competition-history';
import { useBonusVotes } from '../../../hooks/useBonusVotes';
import { useAuthContextSafe } from '../../../contexts/AuthContext';
import BonusVotesChecklist from '../../../components/BonusVotesChecklist';
import { useToast } from '../../../contexts/ToastContext';
import { BONUS_TASK_KEYS } from '../../../lib/bonusVotes';
import { spacing, typography, colors } from '../../../styles/theme';

/**
 * Renders the bonus votes checklist for a single active competition.
 */
function CompetitionBonusVotes({ competitionId, contestantId, userId, competitionName }) {
  const { profile } = useAuthContextSafe();
  const toast = useToast();
  const hasCheckedProfile = useRef(false);

  const {
    tasks, loading, awarding,
    completedCount, totalCount,
    totalBonusVotesEarned, totalBonusVotesAvailable,
    progress, allCompleted,
    checkProfile, awardTask, markHowToWinViewed, markProfileShared,
  } = useBonusVotes(competitionId, contestantId, userId);

  // Auto-check profile completeness and award applicable bonuses
  useEffect(() => {
    if (!loading && profile && !hasCheckedProfile.current && tasks.length > 0) {
      hasCheckedProfile.current = true;
      checkProfile(profile).then((awarded) => {
        if (awarded.length > 0) {
          const totalVotes = awarded.reduce((sum, a) => sum + (a.votes_awarded || 0), 0);
          toast?.success?.(`You earned ${totalVotes} bonus votes!`);
        }
      });
    }
  }, [loading, profile, tasks.length, checkProfile, toast]);

  // Re-check when profile is updated
  useEffect(() => {
    const handler = () => { hasCheckedProfile.current = false; };
    window.addEventListener('profile-updated', handler);
    return () => window.removeEventListener('profile-updated', handler);
  }, []);

  const handleTaskAction = async (taskKey) => {
    if (taskKey === BONUS_TASK_KEYS.VIEW_HOW_TO_WIN) {
      const result = await markHowToWinViewed();
      if (result?.success) {
        toast?.success?.(`+${result.votes_awarded} bonus votes for reviewing How to Win!`);
      }
    } else if (taskKey === BONUS_TASK_KEYS.SHARE_PROFILE) {
      const shareUrl = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Check out my profile!', url: shareUrl });
          const result = await markProfileShared();
          if (result?.success) {
            toast?.success?.(`+${result.votes_awarded} bonus votes for sharing!`);
          }
        } catch { /* user cancelled */ }
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast?.success?.('Profile link copied to clipboard!');
          const result = await markProfileShared();
          if (result?.success) {
            toast?.success?.(`+${result.votes_awarded} bonus votes for sharing!`);
          }
        } catch { /* clipboard not available */ }
      }
    } else {
      const result = await awardTask(taskKey);
      if (result?.success) {
        toast?.success?.(`+${result.votes_awarded} bonus votes!`);
      }
    }
  };

  if (loading || tasks.length === 0) return null;

  return (
    <div style={{ marginBottom: spacing.xl }}>
      {competitionName && (
        <p style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.secondary,
          marginBottom: spacing.sm,
          fontWeight: typography.fontWeight.medium,
        }}>
          {competitionName}
        </p>
      )}
      <BonusVotesChecklist
        tasks={tasks}
        loading={loading}
        awarding={awarding}
        completedCount={completedCount}
        totalCount={totalCount}
        totalBonusVotesEarned={totalBonusVotesEarned}
        totalBonusVotesAvailable={totalBonusVotesAvailable}
        progress={progress}
        allCompleted={allCompleted}
        onTaskAction={handleTaskAction}
      />
    </div>
  );
}

/**
 * ProfileBonusVotes - Shows bonus votes checklists on the user's profile page
 * for any active competitions they're a contestant in.
 */
export default function ProfileBonusVotes({ userId }) {
  const [activeEntries, setActiveEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    getContestantCompetitions(userId).then(entries => {
      // Show for all competitions except completed ones
      const active = entries.filter(entry => {
        const status = entry.competition?.status;
        return status && status !== 'completed';
      });
      setActiveEntries(active);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  if (loading || activeEntries.length === 0) return null;

  return (
    <div>
      {activeEntries.map(entry => (
        <CompetitionBonusVotes
          key={entry.id}
          competitionId={entry.competition_id}
          contestantId={entry.id}
          userId={userId}
          competitionName={activeEntries.length > 1 ? entry.competition?.name : null}
        />
      ))}
    </div>
  );
}
