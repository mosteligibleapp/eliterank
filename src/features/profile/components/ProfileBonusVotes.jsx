import { useState, useEffect, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { Heart, X } from 'lucide-react';
import { getContestantCompetitions, getNominationsForUser } from '../../../lib/competition-history';
import { useBonusVotes } from '../../../hooks/useBonusVotes';
import { useAuthContextSafe } from '../../../contexts/AuthContext';
import BonusVotesChecklist from '../../../components/BonusVotesChecklist';
import { useToast } from '../../../contexts/ToastContext';
import { BONUS_TASK_KEYS, loadNomineeBonusActions, saveNomineeBonusAction, awardNomineeActionBonuses } from '../../../lib/bonusVotes';
import { spacing, typography, colors, borderRadius } from '../../../styles/theme';

const ContestantGuide = lazy(() => import('../../../features/contestant-guide/ContestantGuide'));

/**
 * Default bonus task definitions for building client-side checklist for nominees.
 */
const DEFAULT_BONUS_TASKS = [
  { task_key: 'complete_profile', label: 'Complete your profile', description: 'Fill out your name, bio, and city', votes_awarded: 10, sort_order: 1 },
  { task_key: 'add_photo', label: 'Add a profile photo', description: 'Upload a profile photo so voters can see you', votes_awarded: 5, sort_order: 2 },
  { task_key: 'add_social', label: 'Link a social account', description: 'Connect your Instagram, Twitter, or TikTok', votes_awarded: 5, sort_order: 3 },
  { task_key: 'view_how_to_win', label: 'Review How to Win info', description: 'Read through the competition rules and tips', votes_awarded: 5, sort_order: 4 },
  { task_key: 'share_profile', label: 'Share your profile', description: 'Share your contestant profile link externally', votes_awarded: 5, sort_order: 5 },
];

/**
 * Compact confirmation shown when all bonus votes are earned.
 * Displays a summary and a dismiss button.
 */
function AllCompleteConfirmation({ totalBonusVotesEarned, onDismiss }) {
  return (
    <div style={{
      background: 'rgba(34, 197, 94, 0.06)',
      border: '1px solid rgba(34, 197, 94, 0.25)',
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      display: 'flex',
      alignItems: 'center',
      gap: spacing.md,
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: borderRadius.lg,
        background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.08))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Heart size={20} style={{ color: '#22c55e', fill: '#22c55e' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
        }}>
          All Bonus Votes Earned!
        </span>
        <p style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.secondary,
          marginTop: '2px',
        }}>
          +{totalBonusVotesEarned} votes added to your total
        </p>
        <p style={{
          fontSize: typography.fontSize.xs,
          color: colors.text.muted,
          marginTop: '2px',
          fontStyle: 'italic',
        }}>
          Stay tuned for more bonus vote opportunities
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            padding: spacing.xs,
            cursor: 'pointer',
            color: colors.text.muted,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/**
 * Renders the bonus votes checklist for a contestant (DB-backed).
 */
function CompetitionBonusVotes({ competitionId, contestantId, userId, competitionName, onBonusVotesLoaded }) {
  const { profile } = useAuthContextSafe();
  const toast = useToast();
  const hasCheckedProfile = useRef(false);
  const [showGuide, setShowGuide] = useState(false);
  const dismissKey = `bonus_dismissed_${contestantId}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(dismissKey) === 'true'; } catch { return false; }
  });

  const {
    tasks, loading, awarding,
    completedCount, totalCount,
    totalBonusVotesEarned, totalBonusVotesAvailable,
    progress, allCompleted,
    checkProfile, awardTask, markHowToWinViewed, markProfileShared,
  } = useBonusVotes(competitionId, contestantId, userId);

  // Report bonus votes to parent
  useEffect(() => {
    if (!loading && tasks.length > 0 && onBonusVotesLoaded) {
      onBonusVotesLoaded({ totalEarned: totalBonusVotesEarned, totalAvailable: totalBonusVotesAvailable, allCompleted });
    }
  }, [loading, totalBonusVotesEarned, totalBonusVotesAvailable, allCompleted, tasks.length, onBonusVotesLoaded]);

  // Auto-check profile completeness and award applicable bonuses
  const hasCheckedNomineeActions = useRef(false);
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
  useEffect(() => {
    if (!loading && tasks.length > 0 && userId && competitionId && contestantId && !hasCheckedNomineeActions.current) {
      // Only run if there are incomplete action tasks
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

  // Re-check when profile is updated
  useEffect(() => {
    const handler = () => { hasCheckedProfile.current = false; };
    window.addEventListener('profile-updated', handler);
    return () => window.removeEventListener('profile-updated', handler);
  }, []);

  // Reset dismissed state if new tasks are added (not all complete anymore)
  useEffect(() => {
    if (!allCompleted && dismissed) {
      setDismissed(false);
      try { localStorage.removeItem(dismissKey); } catch { /* ignore */ }
    }
  }, [allCompleted, dismissed, dismissKey]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem(dismissKey, 'true'); } catch { /* ignore */ }
  }, [dismissKey]);

  const handleGuideComplete = async () => {
    setShowGuide(false);
    const result = await markHowToWinViewed();
    if (result?.success) {
      toast?.success?.(`+${result.votes_awarded} bonus votes for reviewing How to Win!`);
    }
  };

  const handleTaskAction = async (taskKey) => {
    if (taskKey === BONUS_TASK_KEYS.VIEW_HOW_TO_WIN) {
      setShowGuide(true);
    } else if (taskKey === BONUS_TASK_KEYS.SHARE_PROFILE) {
      const shareUrl = `${window.location.origin}/profile/${userId}`;
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

  // All tasks complete - show compact confirmation or nothing if dismissed
  if (allCompleted) {
    if (dismissed) return null;
    return (
      <div style={{ marginBottom: spacing.xl }}>
        <AllCompleteConfirmation
          totalBonusVotesEarned={totalBonusVotesEarned}
          onDismiss={handleDismiss}
        />
      </div>
    );
  }

  return (
    <>
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
      {showGuide && (
        <Suspense fallback={null}>
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

/**
 * Renders the bonus votes checklist for a nominee (client-side evaluation).
 * Tasks are evaluated based on profile data — no contestant_id needed.
 * When converted to contestant, the real system auto-awards earned votes.
 */
function NomineeBonusVotes({ competitionName, profile, userId, onBonusVotesLoaded }) {
  const toast = useToast();
  const [showGuide, setShowGuide] = useState(false);
  const dismissKey = userId ? `bonus_dismissed_nominee_${userId}` : null;
  const [dismissed, setDismissed] = useState(() => {
    if (!dismissKey) return false;
    try { return localStorage.getItem(dismissKey) === 'true'; } catch { return false; }
  });

  // Load persisted action-task completions from DB (with localStorage fallback)
  const [actionCompleted, setActionCompleted] = useState({});
  const hasLoadedActions = useRef(false);

  useEffect(() => {
    if (!userId || hasLoadedActions.current) return;
    hasLoadedActions.current = true;
    loadNomineeBonusActions(userId).then(actions => {
      setActionCompleted(actions || {});
    });
  }, [userId]);

  const markActionCompleted = (taskKey) => {
    setActionCompleted(prev => ({ ...prev, [taskKey]: true }));
    if (userId) {
      saveNomineeBonusAction(userId, taskKey);
    }
  };

  // Evaluate task completion from profile data + action tracking
  const tasks = useMemo(() => {
    const hasName = !!(profile?.first_name || profile?.firstName || profile?.name);
    const hasBio = !!(profile?.bio && profile.bio.length > 0);
    const hasCity = !!(profile?.city && profile.city.length > 0);
    const hasPhoto = !!(profile?.avatar_url || profile?.avatarUrl);
    const hasSocial = !!(profile?.instagram || profile?.twitter || profile?.tiktok || profile?.linkedin);

    return DEFAULT_BONUS_TASKS.map(task => {
      let completed = false;
      switch (task.task_key) {
        case 'complete_profile':
          completed = hasName && hasBio && hasCity;
          break;
        case 'add_photo':
          completed = hasPhoto;
          break;
        case 'add_social':
          completed = hasSocial;
          break;
        case 'view_how_to_win':
        case 'share_profile':
          completed = !!actionCompleted[task.task_key];
          break;
        default:
          completed = false;
      }
      return { ...task, id: task.task_key, completed };
    });
  }, [profile, actionCompleted]);

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const totalBonusVotesEarned = tasks.filter(t => t.completed).reduce((sum, t) => sum + t.votes_awarded, 0);
  const totalBonusVotesAvailable = tasks.reduce((sum, t) => sum + t.votes_awarded, 0);
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  // Report bonus votes to parent
  useEffect(() => {
    if (onBonusVotesLoaded) {
      onBonusVotesLoaded({ totalEarned: totalBonusVotesEarned, totalAvailable: totalBonusVotesAvailable, allCompleted });
    }
  }, [totalBonusVotesEarned, totalBonusVotesAvailable, allCompleted, onBonusVotesLoaded]);

  // Reset dismissed state if not all complete anymore
  useEffect(() => {
    if (!allCompleted && dismissed) {
      setDismissed(false);
      if (dismissKey) try { localStorage.removeItem(dismissKey); } catch { /* ignore */ }
    }
  }, [allCompleted, dismissed, dismissKey]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    if (dismissKey) try { localStorage.setItem(dismissKey, 'true'); } catch { /* ignore */ }
  }, [dismissKey]);

  const handleGuideComplete = () => {
    setShowGuide(false);
    if (!actionCompleted[BONUS_TASK_KEYS.VIEW_HOW_TO_WIN]) {
      markActionCompleted(BONUS_TASK_KEYS.VIEW_HOW_TO_WIN);
      const task = DEFAULT_BONUS_TASKS.find(t => t.task_key === BONUS_TASK_KEYS.VIEW_HOW_TO_WIN);
      toast?.success?.(`+${task?.votes_awarded || 5} bonus votes for reviewing How to Win!`);
    }
  };

  const handleTaskAction = async (taskKey) => {
    if (taskKey === BONUS_TASK_KEYS.VIEW_HOW_TO_WIN) {
      setShowGuide(true);
    } else if (taskKey === BONUS_TASK_KEYS.SHARE_PROFILE) {
      const shareUrl = userId ? `${window.location.origin}/profile/${userId}` : window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Check out my profile!', url: shareUrl });
          if (!actionCompleted[BONUS_TASK_KEYS.SHARE_PROFILE]) {
            markActionCompleted(BONUS_TASK_KEYS.SHARE_PROFILE);
            const task = DEFAULT_BONUS_TASKS.find(t => t.task_key === BONUS_TASK_KEYS.SHARE_PROFILE);
            toast?.success?.(`+${task?.votes_awarded || 5} bonus votes for sharing!`);
          } else {
            toast?.success?.('Profile link shared!');
          }
        } catch { /* user cancelled */ }
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl);
          if (!actionCompleted[BONUS_TASK_KEYS.SHARE_PROFILE]) {
            markActionCompleted(BONUS_TASK_KEYS.SHARE_PROFILE);
            const task = DEFAULT_BONUS_TASKS.find(t => t.task_key === BONUS_TASK_KEYS.SHARE_PROFILE);
            toast?.success?.(`Link copied! +${task?.votes_awarded || 5} bonus votes for sharing!`);
          } else {
            toast?.success?.('Profile link copied to clipboard!');
          }
        } catch { /* clipboard not available */ }
      }
    }
  };

  // All tasks complete - show compact confirmation or nothing if dismissed
  if (allCompleted) {
    if (dismissed) return null;
    return (
      <div style={{ marginBottom: spacing.xl }}>
        <AllCompleteConfirmation
          totalBonusVotesEarned={totalBonusVotesEarned}
          onDismiss={handleDismiss}
        />
      </div>
    );
  }

  return (
    <>
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
          completedCount={completedCount}
          totalCount={totalCount}
          totalBonusVotesEarned={totalBonusVotesEarned}
          totalBonusVotesAvailable={totalBonusVotesAvailable}
          progress={progress}
          allCompleted={allCompleted}
          onTaskAction={handleTaskAction}
        />
      </div>
      {showGuide && (
        <Suspense fallback={null}>
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

/**
 * ProfileBonusVotes - Shows bonus votes checklists on the user's profile page
 * for any active competitions they're a contestant or nominee in.
 */
export default function ProfileBonusVotes({ userId, userEmail, profile, onBonusVotesLoaded }) {
  const [contestantEntries, setContestantEntries] = useState([]);
  const [nomineeEntries, setNomineeEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    Promise.all([
      getContestantCompetitions(userId),
      getNominationsForUser(userId, userEmail),
    ]).then(([contestants, nominations]) => {
      // Filter contestants: show for all non-completed competitions
      const activeContestants = contestants.filter(entry => {
        const status = entry.competition?.status;
        return status && status !== 'completed';
      });

      // Filter nominations: non-completed competitions that DON'T already have a contestant entry
      const contestantCompIds = new Set(activeContestants.map(c => c.competition_id));
      const activeNominees = nominations.filter(nom => {
        const status = nom.competition?.status;
        return status && status !== 'completed' && !contestantCompIds.has(nom.competition?.id);
      });

      setContestantEntries(activeContestants);
      setNomineeEntries(activeNominees);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId, userEmail]);

  if (loading || (contestantEntries.length === 0 && nomineeEntries.length === 0)) return null;

  const totalEntries = contestantEntries.length + nomineeEntries.length;

  return (
    <div>
      {contestantEntries.map(entry => (
        <CompetitionBonusVotes
          key={entry.id}
          competitionId={entry.competition_id}
          contestantId={entry.id}
          userId={userId}
          competitionName={totalEntries > 1 ? entry.competition?.name : null}
          onBonusVotesLoaded={onBonusVotesLoaded}
        />
      ))}
      {nomineeEntries.map(nom => (
        <NomineeBonusVotes
          key={nom.id}
          competitionName={totalEntries > 1 ? nom.competition?.name : null}
          profile={profile}
          userId={userId}
          onBonusVotesLoaded={onBonusVotesLoaded}
        />
      ))}
    </div>
  );
}
