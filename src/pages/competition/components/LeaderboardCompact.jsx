import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Crown, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
        {allContestants.map((contestant, index) => {
          const rank = index + 1;
          const isDanger = contestant.zone === 'danger';
          const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';

          return (
            <div
              key={contestant.id}
              className={`portrait-card ${isDanger ? 'at-risk' : ''}`}
              onClick={() => openVoteModal(contestant)}
            >
              {/* Portrait image */}
              <div className="portrait-image-wrap">
                {contestant.avatar_url ? (
                  <img
                    src={contestant.avatar_url}
                    alt={contestant.name}
                    className="portrait-image"
                  />
                ) : (
                  <div className="portrait-placeholder">
                    {contestant.name?.charAt(0)}
                  </div>
                )}
                {/* Rank badge - styled for top 3 */}
                <span className={`portrait-rank ${rankClass}`}>
                  {rank === 1 && <Crown size={10} />}
                  #{rank}
                </span>
                {/* Danger indicator */}
                {isDanger && (
                  <span className="portrait-danger">
                    <AlertTriangle size={12} />
                    At Risk
                  </span>
                )}
              </div>
              {/* Name below image */}
              <div className="portrait-info">
                <span className="portrait-name">{contestant.name?.split(' ')[0]}</span>
                <span className="portrait-votes">{formatVotes(contestant.votes)}</span>
              </div>
            </div>
          );
        })}
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

export default LeaderboardCompact;
