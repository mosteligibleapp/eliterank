import { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import { getContestantCompetitions, getNominationsForUser } from '../../../lib/competition-history';
import { useBonusVotes } from '../../../hooks/useBonusVotes';
import { useAuthContextSafe } from '../../../contexts/AuthContext';
import BonusVotesChecklist from '../../../components/BonusVotesChecklist';
import { useToast } from '../../../contexts/ToastContext';
import { BONUS_TASK_KEYS } from '../../../lib/bonusVotes';
import { spacing, typography, colors } from '../../../styles/theme';

const ContestantGuide = lazy(() => import('../../../features/contestant-guide/ContestantGuide'));

/**
 * Default bonus task definitions for building client-side checklist for nominees.
 */
const DEFAULT_BONUS_TASKS = [
  { task_key: 'complete_profile', label: 'Complete your profile', description: 'Fill out all profile fields including name, bio, city, and age', votes_awarded: 10, sort_order: 1 },
  { task_key: 'add_photo', label: 'Add a profile photo', description: 'Upload a profile photo so voters can see you', votes_awarded: 5, sort_order: 2 },
  { task_key: 'add_bio', label: 'Write your bio', description: 'Tell voters about yourself with a compelling bio', votes_awarded: 5, sort_order: 3 },
  { task_key: 'add_social', label: 'Link a social account', description: 'Connect your Instagram, Twitter, or TikTok', votes_awarded: 5, sort_order: 4 },
  { task_key: 'view_how_to_win', label: 'Review How to Win info', description: 'Read through the competition rules and tips', votes_awarded: 5, sort_order: 5 },
  { task_key: 'share_profile', label: 'Share your profile', description: 'Share your contestant profile link externally', votes_awarded: 5, sort_order: 6 },
];

/**
 * Renders the bonus votes checklist for a contestant (DB-backed).
 */
function CompetitionBonusVotes({ competitionId, contestantId, userId, competitionName }) {
  const { profile } = useAuthContextSafe();
  const toast = useToast();
  const hasCheckedProfile = useRef(false);
  const [showGuide, setShowGuide] = useState(false);

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
function NomineeBonusVotes({ competitionName, profile }) {
  const toast = useToast();
  const [showGuide, setShowGuide] = useState(false);

  // Evaluate task completion from profile data
  const tasks = useMemo(() => {
    const hasName = !!(profile?.first_name || profile?.firstName || profile?.name);
    const hasBio = !!(profile?.bio && profile.bio.length > 0);
    const hasCity = !!(profile?.city && profile.city.length > 0);
    const hasAge = !!(profile?.age && profile.age > 0);
    const hasPhoto = !!(profile?.avatar_url || profile?.avatarUrl);
    const hasSocial = !!(profile?.instagram || profile?.twitter || profile?.tiktok || profile?.linkedin);

    return DEFAULT_BONUS_TASKS.map(task => {
      let completed = false;
      switch (task.task_key) {
        case 'complete_profile':
          completed = hasName && hasBio && hasCity && hasAge;
          break;
        case 'add_photo':
          completed = hasPhoto;
          break;
        case 'add_bio':
          completed = hasBio;
          break;
        case 'add_social':
          completed = hasSocial;
          break;
        // view_how_to_win and share_profile stay uncompleted for nominees
        default:
          completed = false;
      }
      return { ...task, id: task.task_key, completed };
    });
  }, [profile]);

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const totalBonusVotesEarned = tasks.filter(t => t.completed).reduce((sum, t) => sum + t.votes_awarded, 0);
  const totalBonusVotesAvailable = tasks.reduce((sum, t) => sum + t.votes_awarded, 0);
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  const handleTaskAction = async (taskKey) => {
    if (taskKey === BONUS_TASK_KEYS.VIEW_HOW_TO_WIN) {
      setShowGuide(true);
    } else if (taskKey === BONUS_TASK_KEYS.SHARE_PROFILE) {
      const shareUrl = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Check out my profile!', url: shareUrl });
          toast?.success?.('Profile link shared!');
        } catch { /* user cancelled */ }
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast?.success?.('Profile link copied to clipboard!');
        } catch { /* clipboard not available */ }
      }
    }
  };

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
            onComplete={() => setShowGuide(false)}
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
export default function ProfileBonusVotes({ userId, userEmail, profile }) {
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
        />
      ))}
      {nomineeEntries.map(nom => (
        <NomineeBonusVotes
          key={nom.id}
          competitionName={totalEntries > 1 ? nom.competition?.name : null}
          profile={profile}
        />
      ))}
    </div>
  );
}
