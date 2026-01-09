import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
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

/**
 * Inner layout component (has access to context)
 */
function CompetitionLayoutInner() {
  const { loading, error, competition, phase } = usePublicCompetition();
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

  return (
    <div className="competition-layout">
      {/* Floating Back Button */}
      <button
        className="competition-back-btn"
        onClick={handleBack}
        aria-label="Back to explore"
      >
        <ArrowLeft size={20} />
      </button>

      {/* Floating Profile Icon - top right */}
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

      {/* Page content - render appropriate phase view */}
      <main className="competition-main">
        <PhaseContent phase={phase} />
      </main>

      {/* Modals rendered at layout level */}
      <ContestantModals />
    </div>
  );
}

/**
 * Competition Header - minimal branding bar with back button
 */
function CompetitionHeader() {
  const { competition, organization, phase } = usePublicCompetition();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  return (
    <header className="competition-header">
      <div className="competition-header-inner">
        <button
          onClick={handleBack}
          className="competition-back-btn"
          aria-label="Back to competitions"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="competition-branding">
          {organization?.logo && (
            <img
              src={organization.logo}
              alt={organization.name}
              className="competition-org-logo"
            />
          )}
          <div className="competition-title">
            <h1>{competition?.city || 'Competition'}</h1>
            <span className="competition-location">
              {organization?.name || 'Most Eligible'}
            </span>
          </div>
        </div>

        <div className="competition-phase-badge" data-phase={phase?.phase}>
          <span className="phase-indicator" />
          <span className="phase-label">{phase?.label || 'Loading'}</span>
        </div>
      </div>
    </header>
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
 * View Navigation - tabs for main/leaderboard/activity
 */
function ViewNavigation({ currentView }) {
  const { orgSlug, citySlug, year } = usePublicCompetition();

  const basePath = year
    ? `/c/${orgSlug}/${citySlug}/${year}`
    : `/c/${orgSlug}/${citySlug}`;

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
  } = usePublicCompetition();

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

      {/* Vote Modal */}
      {showVoteModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div
            className="modal-container modal-vote"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={closeModals}>
              <X size={18} />
              <span className="sr-only">Close</span>
            </button>

            <div className="vote-modal-content">
              <div className="vote-modal-header">
                {selectedContestant.avatar_url ? (
                  <img
                    src={selectedContestant.avatar_url}
                    alt={selectedContestant.name}
                    className="vote-modal-avatar"
                  />
                ) : (
                  <div className="vote-modal-avatar-placeholder">
                    {selectedContestant.name?.charAt(0)}
                  </div>
                )}
                <h2>Vote for {selectedContestant.name?.split(' ')[0]}</h2>
                <p className="vote-modal-rank">
                  #{selectedContestant.rank || selectedContestant.displayRank} ·{' '}
                  {(selectedContestant.votes || 0).toLocaleString()} votes
                </p>
              </div>

              {/* Free daily vote */}
              <button className="vote-option vote-option-free" disabled>
                <span className="vote-option-label">Free Daily Vote</span>
                <span className="vote-option-status">Coming Soon</span>
              </button>

              {/* Paid vote packs */}
              <div className="vote-packs">
                {[
                  { votes: 10, price: 5 },
                  { votes: 25, price: 10, popular: true },
                  { votes: 100, price: 35 },
                ].map((pack) => (
                  <button
                    key={pack.votes}
                    className={`vote-option vote-option-pack ${pack.popular ? 'popular' : ''}`}
                    disabled
                  >
                    <span className="vote-option-votes">{pack.votes} votes</span>
                    <span className="vote-option-pool">
                      +${(pack.price * 0.5).toFixed(0)} to pool
                    </span>
                    <span className="vote-option-price">${pack.price}</span>
                    <span className="vote-option-status">Coming Soon</span>
                  </button>
                ))}
              </div>

              <p className="vote-modal-note">
                50% of vote purchases go to the prize pool
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Main Layout Wrapper
 * Extracts route params and wraps with provider
 */
export function CompetitionLayout() {
  const { orgSlug, citySlug, year } = useParams();

  return (
    <PublicCompetitionProvider orgSlug={orgSlug} citySlug={citySlug} year={year}>
      <CompetitionLayoutInner />
    </PublicCompetitionProvider>
  );
}

export default CompetitionLayout;
