import { useEffect, useRef, useState, Suspense, lazy } from 'react';
import { useBonusVotes } from '../../../hooks/useBonusVotes';
import { useAuthContextSafe } from '../../../contexts/AuthContext';
import BonusVotesChecklist from '../../../components/BonusVotesChecklist';
import { useToast } from '../../../contexts/ToastContext';
import { BONUS_TASK_KEYS, awardNomineeActionBonuses } from '../../../lib/bonusVotes';

const ContestantGuide = lazy(() => import('../../../features/contestant-guide/ContestantGuide'));

/**
 * ContestantBonusVotes - Wraps the BonusVotesChecklist for the public competition page.
 * Automatically checks profile completeness on mount and awards applicable bonuses.
 */
export default function ContestantBonusVotes({ competitionId, contestantId, userId }) {
  const { profile } = useAuthContextSafe();
  const toast = useToast();
  const hasCheckedProfile = useRef(false);
  const [showGuide, setShowGuide] = useState(false);

  const bonusVotes = useBonusVotes(competitionId, contestantId, userId);

  const {
    tasks,
    loading,
    awarding,
    completedCount,
    totalCount,
    totalBonusVotesEarned,
    totalBonusVotesAvailable,
    progress,
    allCompleted,
    checkProfile,
    markHowToWinViewed,
    markProfileShared,
    awardTask,
  } = bonusVotes;

  // Auto-check profile on mount to award any profile-related bonuses
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

  // Auto-award action-based tasks completed during nominee phase
  const hasCheckedNomineeActions = useRef(false);
  useEffect(() => {
    if (!loading && tasks.length > 0 && userId && competitionId && contestantId && !hasCheckedNomineeActions.current) {
      const hasIncompleteActions = tasks.some(
        t => (t.task_key === 'view_how_to_win' || t.task_key === 'share_profile') && !t.completed
      );
      if (hasIncompleteActions) {
        hasCheckedNomineeActions.current = true;
        awardNomineeActionBonuses(competitionId, contestantId, userId).then((awarded) => {
          if (awarded.length > 0) {
            const totalVotes = awarded.reduce((sum, a) => sum + (a.votes_awarded || 0), 0);
            toast?.success?.(`You earned ${totalVotes} bonus votes!`);
          }
        });
      }
    }
  }, [loading, tasks, userId, competitionId, contestantId, toast]);

  // Listen for the "profile-updated" event to re-check bonuses
  useEffect(() => {
    const handler = () => {
      hasCheckedProfile.current = false;
    };
    window.addEventListener('profile-updated', handler);
    return () => window.removeEventListener('profile-updated', handler);
  }, []);

  const handleGuideComplete = async () => {
    setShowGuide(false);
    const result = await markHowToWinViewed();
    if (result?.success) {
      toast?.success?.(`+${result.votes_awarded} bonus votes for reviewing How to Win!`);
    }
  };

  // Handle task actions (e.g., clicking "view how to win" or "share profile")
  const handleTaskAction = async (taskKey) => {
    if (taskKey === BONUS_TASK_KEYS.VIEW_HOW_TO_WIN) {
      setShowGuide(true);
    } else if (taskKey === BONUS_TASK_KEYS.SHARE_PROFILE) {
      // Attempt to use Web Share API or copy link
      const shareUrl = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Vote for me!', url: shareUrl });
          const result = await markProfileShared();
          if (result?.success) {
            toast?.success?.(`+${result.votes_awarded} bonus votes for sharing!`);
          }
        } catch {
          // User cancelled share
        }
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast?.success?.('Profile link copied to clipboard!');
          const result = await markProfileShared();
          if (result?.success) {
            toast?.success?.(`+${result.votes_awarded} bonus votes for sharing!`);
          }
        } catch {
          // Clipboard not available
        }
      }
    } else {
      // For profile-related tasks, just show a hint
      const result = await awardTask(taskKey);
      if (result?.success) {
        toast?.success?.(`+${result.votes_awarded} bonus votes!`);
      }
    }
  };

  if (loading || tasks.length === 0) return null;

  return (
    <>
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
      {showGuide && (
        <Suspense fallback={<div />}>
          <ContestantGuide
            competition={null}
            mode="page"
            onClose={() => setShowGuide(false)}
            onComplete={handleGuideComplete}
          />
        </Suspense>
      )}
    </>
  );
}
