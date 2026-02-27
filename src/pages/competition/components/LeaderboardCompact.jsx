import { useState, useCallback } from 'react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Crown, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../../components/ui';

/**
 * Image-focused leaderboard - contestants are the STARS
 * Large portrait cards, minimal UI chrome
 */
export function LeaderboardCompact() {
  const {
    contestants,
    dangerZone,
    openContestantProfile,
    openVoteModal,
    orgSlug,
    citySlug,
    year,
  } = usePublicCompetition();

  const navigate = useNavigate();

  const basePath = year
    ? `/c/${orgSlug}/${citySlug}/${year}`
    : `/c/${orgSlug}/${citySlug}`;

  // All contestants in rank order (up to 9 for compact view)
  const allContestants = contestants?.slice(0, 9) || [];

  // Format number with commas
  const formatVotes = (num) => {
    if (!num) return '0';
    return num.toLocaleString();
  };

  return (
    <div className="leaderboard-prominent">
      <div className="leaderboard-header">
        <h3>
          <Crown size={18} />
          Leaderboard
        </h3>
        <span className="live-indicator">
          <span className="live-dot" />
          Live
        </span>
      </div>

      {/* All Contestants - Unified Portrait Grid */}
      <div className="portrait-grid">
        {allContestants.length === 0 ? (
          <EmptyState
            icon={Crown}
            title="No contestants yet"
            description="Contestants will appear here when they join"
            compact
          />
        ) : (
          allContestants.map((contestant, index) => (
            <PortraitCard
              key={contestant.id}
              contestant={contestant}
              rank={index + 1}
              onVote={openVoteModal}
            />
          ))
        )}
      </div>

      {/* Danger Zone Summary */}
      {dangerZone?.length > 0 && (
        <div className="danger-zone-summary">
          <AlertTriangle size={12} />
          <span>{dangerZone.length} contestants at risk of elimination</span>
        </div>
      )}

      {/* View All Link */}
      <button
        className="leaderboard-view-all"
        onClick={() => navigate(`${basePath}/leaderboard`)}
      >
        View All {contestants?.length || 0} Contestants
      </button>
    </div>
  );
}

function PortraitCard({ contestant, rank, onVote }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const handleError = useCallback(() => setImgFailed(true), []);
  const handleLoad = useCallback(() => setImgLoaded(true), []);

  const isDanger = contestant.zone === 'danger';
  const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
  const showImg = contestant.avatar_url && !imgFailed;

  return (
    <div
      className={`portrait-card ${isDanger ? 'at-risk' : ''}`}
      onClick={() => onVote(contestant)}
    >
      <div className="portrait-image-wrap">
        <div className="portrait-placeholder">
          {contestant.name?.charAt(0)}
        </div>
        {showImg && (
          <img
            src={contestant.avatar_url}
            alt={contestant.name}
            className="portrait-image"
            style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.2s ease' }}
            onLoad={handleLoad}
            onError={handleError}
          />
        )}
        <span className={`portrait-rank ${rankClass}`}>
          {rank === 1 && <Crown size={10} />}
          #{rank}
        </span>
        {isDanger && (
          <span className="portrait-danger">
            <AlertTriangle size={12} />
            At Risk
          </span>
        )}
      </div>
      <div className="portrait-info">
        <span className="portrait-name">{contestant.name?.split(' ')[0]}</span>
        <span className="portrait-votes">{contestant.votes ? contestant.votes.toLocaleString() : '0'}</span>
      </div>
    </div>
  );
}

export default LeaderboardCompact;
