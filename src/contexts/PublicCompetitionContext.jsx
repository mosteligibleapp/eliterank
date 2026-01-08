import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useState,
} from 'react';
import { useCompetitionPublic } from '../hooks/useCompetitionPublic';
import { useActivityFeed } from '../hooks/useActivityFeed';
import { useLeaderboard } from '../hooks/useLeaderboard';
import useCountdown from '../hooks/useCountdown';

// Create context
const PublicCompetitionContext = createContext(null);

/**
 * Provider component for public competition pages
 * Wraps hooks and provides unified data access
 */
export function PublicCompetitionProvider({
  orgSlug,
  citySlug,
  year = null,
  children,
}) {
  // Modal states (lifted here so any component can trigger them)
  const [selectedContestant, setSelectedContestant] = useState(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Main competition data
  const competitionData = useCompetitionPublic(orgSlug, citySlug, year);

  const {
    competition,
    organization,
    phase,
    prizePool,
    about,
    theme,
    sponsors,
    events,
    rules,
    announcements,
    votingRounds,
    loading: competitionLoading,
    error: competitionError,
    refetch: refetchCompetition,
  } = competitionData;

  // Leaderboard data (only fetch if we have a competition)
  const leaderboardData = useLeaderboard(competition?.id, {
    realtime: phase?.isVoting ?? false,
    eliminationThreshold: 0.2,
  });

  // Activity feed (only fetch if we have a competition)
  const activityData = useActivityFeed(competition?.id, {
    limit: 20,
    realtime: phase?.isVoting ?? false,
  });

  // Countdown timer
  const countdownTarget = useMemo(() => {
    if (!phase) return null;

    // Determine what to count down to based on phase
    if (phase.phase === 'coming-soon') {
      return competition?.nomination_start;
    }
    if (phase.phase === 'nominations') {
      return competition?.nomination_end;
    }
    if (phase.isVoting && phase.currentRound) {
      return phase.currentRound.end_date;
    }
    if (phase.phase === 'between-rounds' && phase.nextRound) {
      return phase.nextRound.start_date;
    }
    return null;
  }, [phase, competition]);

  const countdown = useCountdown(countdownTarget);

  // Contestant actions
  const openContestantProfile = useCallback((contestant) => {
    setSelectedContestant(contestant);
    setShowProfileModal(true);
    setShowVoteModal(false);
  }, []);

  const openVoteModal = useCallback((contestant) => {
    setSelectedContestant(contestant);
    setShowVoteModal(true);
    setShowProfileModal(false);
  }, []);

  const closeModals = useCallback(() => {
    setShowVoteModal(false);
    setShowProfileModal(false);
    // Don't clear selectedContestant immediately for animation purposes
    setTimeout(() => setSelectedContestant(null), 300);
  }, []);

  // Switch from profile to vote
  const switchToVote = useCallback(() => {
    setShowProfileModal(false);
    setShowVoteModal(true);
  }, []);

  // Combined loading state
  const loading = competitionLoading;

  // Combined error state
  const error = competitionError;

  // Build context value
  const value = useMemo(
    () => ({
      // Route params
      orgSlug,
      citySlug,
      year,

      // Core data
      competition,
      organization,

      // Computed/merged values
      phase,
      prizePool,
      about,
      theme,
      countdown,

      // Related data
      sponsors,
      events,
      rules,
      announcements,
      votingRounds,

      // Leaderboard
      contestants: leaderboardData.contestants,
      topThree: leaderboardData.topThree,
      dangerZone: leaderboardData.dangerZone,
      leaderboardStats: leaderboardData.stats,
      sortBy: leaderboardData.sortBy,
      changeSort: leaderboardData.changeSort,
      getContestant: leaderboardData.getContestant,
      getContestantBySlug: leaderboardData.getContestantBySlug,

      // Activity feed
      activities: activityData.activities,
      activitiesLoading: activityData.loading,
      hasMoreActivities: activityData.hasMore,
      loadMoreActivities: activityData.loadMore,

      // Modal state
      selectedContestant,
      showVoteModal,
      showProfileModal,

      // Modal actions
      openContestantProfile,
      openVoteModal,
      closeModals,
      switchToVote,

      // Global state
      loading,
      error,

      // Actions
      refetch: refetchCompetition,
    }),
    [
      orgSlug,
      citySlug,
      year,
      competition,
      organization,
      phase,
      prizePool,
      about,
      theme,
      countdown,
      sponsors,
      events,
      rules,
      announcements,
      votingRounds,
      leaderboardData,
      activityData,
      selectedContestant,
      showVoteModal,
      showProfileModal,
      openContestantProfile,
      openVoteModal,
      closeModals,
      switchToVote,
      loading,
      error,
      refetchCompetition,
    ]
  );

  return (
    <PublicCompetitionContext.Provider value={value}>
      {children}
    </PublicCompetitionContext.Provider>
  );
}

/**
 * Hook to access public competition context
 * Must be used within PublicCompetitionProvider
 */
export function usePublicCompetition() {
  const context = useContext(PublicCompetitionContext);

  if (!context) {
    throw new Error(
      'usePublicCompetition must be used within a PublicCompetitionProvider'
    );
  }

  return context;
}

export default PublicCompetitionContext;
