import { useState, useEffect } from 'react';
import { useParams, useLocation, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  PublicCompetitionProvider,
  usePublicCompetition,
} from '../../contexts/PublicCompetitionContext';
import { AlertCircle, Loader, X, ArrowLeft } from 'lucide-react';
import { useSupabaseAuth } from '../../hooks';
import { ProfileIcon } from '../../components/ui';

// Phase view components
import ComingSoonPhase from './phases/ComingSoonPhase';
import NominationsPhase from './phases/NominationsPhase';
import VotingPhase from './phases/VotingPhase';
import BetweenRoundsPhase from './phases/BetweenRoundsPhase';
import ResultsPhase from './phases/ResultsPhase';

// View components for different pages
import LeaderboardView from './views/LeaderboardView';
import ActivityView from './views/ActivityView';

// Shared components
import { CompetitionHeader } from './components/CompetitionHeader';
import VoteModal from '../../features/public-site/components/VoteModal';

/**
 * Inner layout component (has access to context)
 */
function CompetitionLayoutInner() {
  const { loading, error, competition, phase, showVoteModal, showProfileModal } = usePublicCompetition();
  const location = useLocation();
  const navigate = useNavigate();

  // Auth state for profile icon
  const {
    user,
    profile,
    isAuthenticated,
    signOut,
  } = useSupabaseAuth();

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

  const handleLogout = async () => {
    await signOut();
  };

  // Loading state
  if (loading) {
    return (
      <div className="competition-layout">
        <div className="competition-loading">
          <Loader className="loading-spinner" size={32} />
          <p>Loading competition...</p>
        </div>
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
  const isLeaderboardView = location.pathname.endsWith('/leaderboard');
  const isActivityView = location.pathname.endsWith('/activity');
  const isContestantView = location.pathname.includes('/e/');

  const handleBack = () => {
    navigate('/');
  };

  // Hide floating buttons when modals are open
  const isModalOpen = showVoteModal || showProfileModal;

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

      {/* Floating Profile Icon - hidden when modal open */}
      {!isModalOpen && (
        <div className="competition-profile-btn">
          <ProfileIcon
            isAuthenticated={isAuthenticated}
            user={user}
            profile={profile}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onProfile={handleProfile}
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
        {phase?.isVoting && isLeaderboardView ? (
          <LeaderboardView />
        ) : phase?.isVoting && isActivityView ? (
          <ActivityView />
        ) : (
          <PhaseContent phase={phase} />
        )}
      </main>

      {/* Modals rendered at layout level */}
      <ContestantModals />
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
  const { orgSlug, citySlug, year, demographicSlug } = usePublicCompetition();

  // Build base path using new URL format: /:orgSlug/:city-{demographic}-{year}
  const cityPart = citySlug?.replace(/-[a-z]{2}$/i, '') || 'unknown';
  const basePath = demographicSlug && demographicSlug !== 'open'
    ? `/${orgSlug}/${cityPart}-${demographicSlug}-${year}`
    : `/${orgSlug}/${cityPart}-${year}`;

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
  const { user, isAuthenticated } = useSupabaseAuth();
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
 * Supports both new format (/:orgSlug/:slug) and legacy format (/c/:orgSlug/:citySlug/:year)
 */
export function CompetitionLayout() {
  const params = useParams();
  const location = useLocation();

  // Determine if this is legacy or new format based on URL
  const isLegacyFormat = location.pathname.startsWith('/c/');

  let orgSlug, citySlug, year, demographicSlug;

  if (isLegacyFormat) {
    // Legacy format: /c/:orgSlug/:citySlug/:year
    orgSlug = params.orgSlug;
    citySlug = params.citySlug;
    year = params.year;
    demographicSlug = null;
  } else {
    // New format: /:orgSlug/:slug where slug is {city}-{year} or {city}-{demographic}-{year}
    orgSlug = params.orgSlug;
    const slug = params.slug;

    if (slug) {
      // Import parseCompetitionSlug dynamically to avoid circular deps
      // Pattern: {city}-{year} or {city}-{demographic}-{year}
      const yearMatch = slug.match(/-(\d{4})($|\/)/);
      if (yearMatch) {
        year = yearMatch[1];
        const withoutYear = slug.replace(/-\d{4}($|\/).*/, '');

        // Known demographic slugs
        const demographicSlugs = [
          'women-21-39', 'women-40-plus',
          'men-21-39', 'men-40-plus',
          'lgbtq-plus-21-39', 'lgbtq-plus-40-plus',
        ];

        // Check if any demographic slug is at the end
        let foundDemographic = null;
        for (const demoSlug of demographicSlugs) {
          if (withoutYear.endsWith(`-${demoSlug}`)) {
            foundDemographic = demoSlug;
            citySlug = withoutYear.slice(0, -(demoSlug.length + 1));
            break;
          }
        }

        if (!foundDemographic) {
          citySlug = withoutYear;
        }
        demographicSlug = foundDemographic;
      }
    }
  }

  return (
    <PublicCompetitionProvider
      orgSlug={orgSlug}
      citySlug={citySlug}
      year={year}
      demographicSlug={demographicSlug}
    >
      <CompetitionLayoutInner />
    </PublicCompetitionProvider>
  );
}

export default CompetitionLayout;
