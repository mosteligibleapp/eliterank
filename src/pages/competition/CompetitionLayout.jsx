import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useLocation, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  PublicCompetitionProvider,
  usePublicCompetition,
} from '../../contexts/PublicCompetitionContext';
import { AlertCircle, X, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../stores';
import { ProfileIcon, NotificationBell, CompetitionPageSkeleton } from '../../components/ui';
import { Skeleton, SkeletonText } from '../../components/ui/Skeleton';

// Phase view components (lazy-loaded — only the active phase is needed)
const ComingSoonPhase = lazy(() => import('./phases/ComingSoonPhase'));
const NominationsPhase = lazy(() => import('./phases/NominationsPhase'));
const VotingPhase = lazy(() => import('./phases/VotingPhase'));
const BetweenRoundsPhase = lazy(() => import('./phases/BetweenRoundsPhase'));
const ResultsPhase = lazy(() => import('./phases/ResultsPhase'));

// View components for different pages (lazy-loaded)
const LeaderboardView = lazy(() => import('./views/LeaderboardView'));
const ActivityView = lazy(() => import('./views/ActivityView'));

// Shared components
import { CompetitionHeader } from './components/CompetitionHeader';
import VoteModal from '../../features/public-site/components/VoteModal';

// Entry flow (lazy loaded)
const EntryFlow = lazy(() => import('../../features/entry/EntryFlow'));

// Contestant Guide (lazy loaded)
const ContestantGuide = lazy(() => import('../../features/contestant-guide/ContestantGuide'));

/**
 * Lightweight skeleton for the main competition content area.
 * Used as a Suspense fallback while phase views or leaderboard/activity load.
 */
function CompetitionContentSkeleton() {
  return (
    <div style={{ padding: '24px 16px', maxWidth: 800, margin: '0 auto' }}>
      <Skeleton width="60%" height={24} borderRadius={6} />
      <Skeleton width="40%" height={16} borderRadius={4} style={{ marginTop: 12 }} />
      <SkeletonText lines={4} lineHeight={14} gap={10} style={{ marginTop: 24 }} />
    </div>
  );
}

/**
 * Inner layout component (has access to context)
 */
function CompetitionLayoutInner() {
  const {
    loading,
    error,
    competition,
    phase,
    showVoteModal,
    showProfileModal,
    votingRounds,
    prizePool,
    about,
    contestants,
    organization,
  } = usePublicCompetition();
  const location = useLocation();
  const navigate = useNavigate();

  // Guide modal state
  const [showGuide, setShowGuide] = useState(false);

  // Auth state for profile icon (from Zustand — avoids duplicate getSession calls)
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const signOut = useAuthStore(s => s.signOut);

  // Check if user has dashboard access
  const hasDashboardAccess = profile?.is_host || profile?.is_super_admin;

  // Navigation handlers for profile icon
  const handleLogin = () => {
    // Navigate to home with login state
    navigate('/?login=true');
  };

  const handleProfile = () => {
    navigate('/?profile=true');
  };

  const handleDashboard = () => {
    navigate('/?dashboard=true');
  };

  const handleRewards = () => {
    navigate('/?rewards=true');
  };

  const handleHowToCompete = () => {
    setShowGuide(true);
  };

  const handleCloseGuide = () => {
    setShowGuide(false);
  };

  const handleLogout = async () => {
    await signOut();
  };

  // Loading state
  if (loading) {
    return (
      <div className="competition-layout">
        <CompetitionPageSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="competition-layout">
        <div className="competition-error">
          <AlertCircle size={48} />
          <h2>Competition Not Found</h2>
          <p>
            {error.message === 'Competition not found'
              ? "We couldn't find this competition. It may have been removed or the URL is incorrect."
              : 'Something went wrong loading this competition. Please try again.'}
          </p>
          <a href="/" className="btn btn-primary">
            Go Home
          </a>
        </div>
      </div>
    );
  }

  // Not public (draft/cancelled)
  if (phase && !phase.isPublic) {
    return (
      <div className="competition-layout">
        <div className="competition-error">
          <AlertCircle size={48} />
          <h2>Competition Not Available</h2>
          <p>This competition is not currently public.</p>
          <a href="/" className="btn btn-primary">
            Go Home
          </a>
        </div>
      </div>
    );
  }

  // Determine current view from URL
  const isEntryView = location.pathname.endsWith('/enter');
  const isLeaderboardView = location.pathname.endsWith('/leaderboard');
  const isActivityView = location.pathname.endsWith('/activity');
  const isContestantView = location.pathname.includes('/e/');

  const handleBack = () => {
    navigate('/');
  };

  // Render entry flow as full-screen overlay
  if (isEntryView) {
    return (
      <Suspense fallback={<div className="entry-flow" />}>
        <EntryFlow />
      </Suspense>
    );
  }

  // Hide floating buttons when modals are open
  const isModalOpen = showVoteModal || showProfileModal || showGuide;

  return (
    <div className="competition-layout">
      {/* Floating Back Button - hidden when modal open */}
      {!isModalOpen && (
        <button
          className="competition-back-btn"
          onClick={handleBack}
          aria-label="Back to explore"
        >
          <ArrowLeft size={20} />
        </button>
      )}

      {/* Floating Profile & Notification Icons - hidden when modal open */}
      {!isModalOpen && (
        <div className="competition-profile-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isAuthenticated && <NotificationBell size={40} />}
          <ProfileIcon
            isAuthenticated={isAuthenticated}
            user={user}
            profile={profile}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onProfile={handleProfile}
            onRewards={handleRewards}
            onHowToCompete={profile?.is_nominee_or_contestant ? handleHowToCompete : undefined}
            onDashboard={hasDashboardAccess ? handleDashboard : null}
            hasDashboardAccess={hasDashboardAccess}
            size={40}
          />
        </div>
      )}

      {/* View Navigation - only during voting phases */}
      {phase?.isVoting && !isContestantView && (
        <ViewNavigation
          currentView={
            isLeaderboardView
              ? 'leaderboard'
              : isActivityView
                ? 'activity'
                : 'main'
          }
        />
      )}

      {/* Page content - render appropriate view based on URL */}
      <main className="competition-main">
        {/* Persistent Competition Header - shown on all voting views */}
        {phase?.isVoting && !isContestantView && (isLeaderboardView || isActivityView) && (
          <CompetitionHeader
            badge={phase?.label}
            badgeVariant="live"
          />
        )}
        <Suspense fallback={<CompetitionContentSkeleton />}>
          {phase?.isVoting && isLeaderboardView ? (
            <LeaderboardView />
          ) : phase?.isVoting && isActivityView ? (
            <ActivityView />
          ) : (
            <PhaseContent phase={phase} />
          )}
        </Suspense>
      </main>

      {/* Modals rendered at layout level */}
      <ContestantModals />

      {/* Contestant Guide Modal */}
      {showGuide && (
        <Suspense fallback={<div />}>
          <ContestantGuide
            competition={competition}
            votingRounds={votingRounds}
            prizePool={prizePool}
            about={about}
            phase={phase}
            mode="page"
            onClose={handleCloseGuide}
            onComplete={handleCloseGuide}
          />
        </Suspense>
      )}
    </div>
  );
}

/**
 * Phase Content - renders the appropriate phase view
 */
function PhaseContent({ phase }) {
  const phaseName = phase?.phase || 'unknown';

  // Map phase to component
  switch (phaseName) {
    case 'coming-soon':
      return <ComingSoonPhase />;

    case 'nominations':
      return <NominationsPhase />;

    case 'results':
      return <ResultsPhase />;

    case 'between-rounds':
      return <BetweenRoundsPhase />;

    // All voting phases (round1, round2, resurrection, finals, etc.)
    default:
      if (phase?.isVoting || phaseName.startsWith('round') || phaseName === 'finals' || phaseName === 'resurrection') {
        return <VotingPhase />;
      }
      // Fallback for unknown phases - show voting or coming soon based on isPublic
      if (phase?.isPublic) {
        return <VotingPhase />;
      }
      return <ComingSoonPhase />;
  }
}

/**
 * View Navigation - tabs for main/leaderboard
 */
function ViewNavigation({ currentView }) {
  const { orgSlug, competitionSlug } = usePublicCompetition();

  // Build base path using competition slug directly
  const basePath = `/${orgSlug}/${competitionSlug}`;

  const views = [
    { id: 'main', label: 'Competition', path: basePath },
    { id: 'leaderboard', label: 'Leaderboard', path: `${basePath}/leaderboard` },
    { id: 'activity', label: 'Activity', path: `${basePath}/activity` },
  ];

  return (
    <nav className="competition-view-nav">
      <div className="view-nav-inner">
        {views.map((view) => (
          <Link
            key={view.id}
            to={view.path}
            className={`view-nav-item ${currentView === view.id ? 'active' : ''}`}
          >
            {view.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/**
 * Contestant Modals - Profile and Vote modals
 */
function ContestantModals() {
  const {
    selectedContestant,
    showProfileModal,
    showVoteModal,
    closeModals,
    switchToVote,
    competition,
    phase,
    openVoteModal,
    getContestant,
  } = usePublicCompetition();

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore(s => s.user);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [voteCount, setVoteCount] = useState(1);

  // Build current round info for VoteModal
  const currentRound = phase?.currentRound
    ? { ...phase.currentRound, isActive: phase.isVoting }
    : { isActive: phase?.isVoting ?? false };

  // Auto-open vote modal for contestant if voteFor param is present
  useEffect(() => {
    const voteForId = searchParams.get('voteFor');
    if (voteForId && isAuthenticated && getContestant) {
      const contestant = getContestant(voteForId);
      if (contestant) {
        openVoteModal(contestant);
        // Clear the param from URL
        searchParams.delete('voteFor');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, isAuthenticated, getContestant, openVoteModal, setSearchParams]);

  const handleLogin = () => {
    // Build return URL with contestant ID so we can reopen the modal after login
    const returnUrl = `${location.pathname}${selectedContestant ? `?voteFor=${selectedContestant.id}` : ''}`;
    navigate(`/?login=true&returnTo=${encodeURIComponent(returnUrl)}`);
  };

  if (!selectedContestant) return null;

  return (
    <>
      {/* Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModals}>
              <X size={18} />
              <span className="sr-only">Close</span>
            </button>

            <div className="contestant-profile-modal">
              <div className="profile-modal-header">
                {selectedContestant.avatar_url ? (
                  <img
                    src={selectedContestant.avatar_url}
                    alt={selectedContestant.name}
                    className="profile-modal-avatar"
                  />
                ) : (
                  <div className="profile-modal-avatar-placeholder">
                    {selectedContestant.name?.charAt(0)}
                  </div>
                )}
                <h2>{selectedContestant.name}</h2>
                <p className="profile-modal-rank">
                  #{selectedContestant.rank || selectedContestant.displayRank} ·{' '}
                  {(selectedContestant.votes || 0).toLocaleString()} votes
                </p>
              </div>

              {selectedContestant.bio && (
                <div className="profile-modal-bio">
                  <p>{selectedContestant.bio}</p>
                </div>
              )}

              <button onClick={switchToVote} className="btn btn-primary btn-full">
                Vote for {selectedContestant.name?.split(' ')[0]}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vote Modal - Functional voting */}
      <VoteModal
        isOpen={showVoteModal}
        onClose={closeModals}
        contestant={selectedContestant}
        voteCount={voteCount}
        onVoteCountChange={setVoteCount}
        isAuthenticated={isAuthenticated}
        onLogin={handleLogin}
        competitionId={competition?.id}
        user={user}
        currentRound={currentRound}
      />
    </>
  );
}

/**
 * Main Layout Wrapper
 * Extracts route params and wraps with provider
 * Supports:
 * - ID format: /:orgSlug/id/:competitionId (most reliable)
 * - Slug format: /:orgSlug/:slug
 * - Legacy format: /c/:orgSlug/:citySlug/:year
 */
export function CompetitionLayout() {
  const params = useParams();
  const location = useLocation();

  // Determine format based on URL
  const isLegacyFormat = location.pathname.startsWith('/c/');
  const isIdFormat = params.competitionId != null;

  let orgSlug, competitionSlug, competitionId;

  if (isIdFormat) {
    // ID format: /:orgSlug/id/:competitionId - lookup by ID
    orgSlug = params.orgSlug;
    competitionId = params.competitionId;
    competitionSlug = null;
  } else if (isLegacyFormat) {
    // Legacy format: /c/:orgSlug/:citySlug/:year - construct slug
    orgSlug = params.orgSlug;
    competitionSlug = `${params.citySlug}-${params.year}`;
  } else {
    // Slug format: /:orgSlug/:slug - use slug directly
    orgSlug = params.orgSlug;
    // Remove any trailing path segments (e.g., /leaderboard, /activity)
    competitionSlug = params.slug?.split('/')[0] || params.slug;
  }

  return (
    <PublicCompetitionProvider
      orgSlug={orgSlug}
      competitionSlug={competitionSlug}
      competitionId={competitionId}
    >
      <CompetitionLayoutInner />
    </PublicCompetitionProvider>
  );
}

export default CompetitionLayout;
