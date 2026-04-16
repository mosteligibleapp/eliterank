import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Instagram, MapPin, AlertCircle } from 'lucide-react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';

/**
 * Contestant profile page — the shareable `/.../e/:contestantSlug` URL.
 *
 * Renders inline on the competition route, not as a modal. A contestant
 * can share the URL and anyone who opens it sees their profile. During
 * active voting, a "Vote for X" CTA opens the vote modal; between rounds
 * the CTA is suppressed.
 */
export function ContestantView() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    getContestantBySlug,
    openVoteModal,
    phase,
    loading,
  } = usePublicCompetition();

  // Extract the contestant slug from the URL — the competition route uses
  // a wildcard `/*` so react-router doesn't give us the slug via useParams.
  const contestantSlug = useMemo(() => {
    const match = location.pathname.match(/\/e\/([^/?#]+)\/?$/);
    return match ? match[1] : null;
  }, [location.pathname]);

  // Base competition URL = current path minus the trailing /e/:slug.
  // Used for the back link; preserves query params like ?preview=voting.
  const basePath = location.pathname.replace(/\/e\/[^/]+\/?$/, '') || '/';
  const backHref = `${basePath}${location.search || ''}`;

  const contestant = contestantSlug && !loading
    ? getContestantBySlug(contestantSlug)
    : null;

  const isBetweenRounds = phase?.phase === 'between-rounds';

  const handleBack = () => {
    navigate(backHref);
  };

  const handleVote = () => {
    if (contestant) openVoteModal(contestant);
  };

  const instagramUrl = (handle) => {
    if (!handle) return null;
    const clean = handle
      .replace(/^@/, '')
      .replace(/^https?:\/\/(www\.)?instagram\.com\//, '')
      .replace(/\/+$/, '');
    return `https://instagram.com/${clean}`;
  };

  if (loading) {
    return <div className="contestant-view" />;
  }

  if (!contestant) {
    return (
      <div className="contestant-view">
        <button className="contestant-view-back" onClick={handleBack}>
          <ArrowLeft size={16} />
          Back to competition
        </button>
        <div className="contestant-view-missing">
          <AlertCircle size={40} />
          <h2>Contestant not found</h2>
          <p>This contestant may have been removed or the URL is incorrect.</p>
        </div>
      </div>
    );
  }

  const igUrl = instagramUrl(contestant.instagram);

  return (
    <div className="contestant-view">
      <button className="contestant-view-back" onClick={handleBack}>
        <ArrowLeft size={16} />
        Back to competition
      </button>

      <div className="contestant-view-card">
        <div className="contestant-view-avatar">
          {contestant.avatar_url ? (
            <img src={contestant.avatar_url} alt={contestant.name} />
          ) : (
            <span className="contestant-view-avatar-fallback">
              {contestant.name?.charAt(0)}
            </span>
          )}
        </div>

        <h1 className="contestant-view-name">{contestant.name}</h1>

        {(contestant.city || contestant.age) && (
          <div className="contestant-view-meta">
            {contestant.city && (
              <span>
                <MapPin size={14} />
                {contestant.city}
              </span>
            )}
            {contestant.age && <span>{contestant.age}</span>}
          </div>
        )}

        {/* Rank + votes only make sense during/after voting — skip them
            while we're paused between rounds. */}
        {!isBetweenRounds && (contestant.displayRank || contestant.rank) && (
          <div className="contestant-view-stats">
            <span className="contestant-view-stat">
              <span className="contestant-view-stat-label">Rank</span>
              <span className="contestant-view-stat-value">
                #{contestant.displayRank || contestant.rank}
              </span>
            </span>
            <span className="contestant-view-stat">
              <span className="contestant-view-stat-label">Votes</span>
              <span className="contestant-view-stat-value">
                {(contestant.votes || 0).toLocaleString()}
              </span>
            </span>
          </div>
        )}

        {contestant.bio && (
          <p className="contestant-view-bio">{contestant.bio}</p>
        )}

        {igUrl && (
          <a
            href={igUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="contestant-view-instagram"
          >
            <Instagram size={16} />
            @{contestant.instagram.replace(/^@/, '')}
          </a>
        )}

        {/* Vote CTA only during active voting phases */}
        {phase?.isVoting && (
          <button
            className="btn btn-primary btn-full contestant-view-vote"
            onClick={handleVote}
          >
            Vote for {contestant.name?.split(' ')[0]}
          </button>
        )}
      </div>
    </div>
  );
}

export default ContestantView;
