import { useState, useCallback } from 'react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Crown, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import CrownIcon from '../../../components/ui/icons/CrownIcon';

/**
 * Image-focused leaderboard - contestants are the STARS
 * Large portrait cards, minimal UI chrome
 */
export function LeaderboardCompact() {
  const {
    contestants,
    competition,
    phase,
    dangerZone,
    openContestantProfile,
    openVoteModal,
  } = usePublicCompetition();

  // Top N contestants are "winners" and get the EliteRank crown badge
  // instead of a rank number. Driven by the competition's configured
  // number_of_winners so every competition behaves correctly.
  const numberOfWinners = competition?.number_of_winners || 1;

  // During the interim between-rounds phase we hide rank badges and vote
  // counts — no active voting is happening, so showing ranks/votes would
  // be misleading.
  const isBetweenRounds = phase?.phase === 'between-rounds';

  const navigate = useNavigate();
  const location = useLocation();

  // Build the leaderboard URL from the current path so it works across all
  // URL formats (slug, ID, legacy) and preserves query params like
  // ?preview=voting when a host is previewing the voting page.
  const stripTrailing = (p) => p.replace(/\/(leaderboard|activity|enter)\/?$/, '').replace(/\/$/, '');
  const basePath = stripTrailing(location.pathname);
  const leaderboardPath = `${basePath}/leaderboard${location.search || ''}`;

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
        {allContestants.map((contestant, index) => (
          <PortraitCard
            key={contestant.id}
            contestant={contestant}
            rank={index + 1}
            numberOfWinners={numberOfWinners}
            hideRank={isBetweenRounds}
            hideVotes={isBetweenRounds}
            hideDanger={isBetweenRounds}
            onVote={openVoteModal}
          />
        ))}
      </div>

      {/* Danger Zone Summary — hidden between rounds, since nothing is
          actively being voted on */}
      {!isBetweenRounds && dangerZone?.length > 0 && (
        <div className="danger-zone-summary">
          <AlertTriangle size={12} />
          <span>{dangerZone.length} contestants at risk of elimination</span>
        </div>
      )}

      {/* View All Link */}
      <button
        className="leaderboard-view-all"
        onClick={() => navigate(leaderboardPath)}
      >
        View All Contestants
      </button>
    </div>
  );
}

export function PortraitCard({
  contestant,
  rank,
  numberOfWinners = 1,
  hideRank = false,
  hideVotes = false,
  hideDanger = false,
  onVote,
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const handleError = useCallback(() => setImgFailed(true), []);
  const handleLoad = useCallback(() => setImgLoaded(true), []);

  const isDanger = !hideDanger && contestant.zone === 'danger';
  const isWinner = rank <= numberOfWinners;
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
        {!hideRank && (isWinner ? (
          <span
            className="portrait-rank portrait-rank-winner"
            aria-label={`Winner rank ${rank}`}
          >
            <CrownIcon size={14} color="#0a0a0f" />
          </span>
        ) : (
          <span className="portrait-rank">#{rank}</span>
        ))}
        {isDanger && (
          <span className="portrait-danger">
            <AlertTriangle size={12} />
            At Risk
          </span>
        )}
      </div>
      <div className="portrait-info">
        <span className="portrait-name">{contestant.name?.split(' ')[0]}</span>
        {!hideVotes && (
          <span className="portrait-votes">{contestant.votes ? contestant.votes.toLocaleString() : '0'}</span>
        )}
      </div>
    </div>
  );
}

export default LeaderboardCompact;
