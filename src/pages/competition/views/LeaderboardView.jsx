import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Crown } from 'lucide-react';

/**
 * Full leaderboard page - clean grid of contestant cards
 */
export function LeaderboardView() {
  const {
    contestants,
    openContestantProfile,
    openVoteModal,
  } = usePublicCompetition();

  return (
    <div className="leaderboard-full">
      {/* Grid of contestants */}
      <div className="contestant-grid">
        {contestants?.map((contestant) => (
          <div
            key={contestant.id}
            className={`contestant-card ${contestant.displayRank === 1 ? 'is-leader' : ''}`}
          >
            {/* Rank badge */}
            <div className={`contestant-rank ${contestant.displayRank <= 3 ? 'top-three' : ''}`}>
              {contestant.displayRank === 1 ? (
                <Crown size={12} />
              ) : (
                `#${contestant.displayRank}`
              )}
            </div>

            {/* Photo - prominent */}
            <div
              className="contestant-photo"
              onClick={() => openContestantProfile(contestant)}
            >
              {contestant.avatar_url ? (
                <img
                  src={contestant.avatar_url}
                  alt={contestant.name}
                />
              ) : (
                <div className="contestant-photo-placeholder">
                  {contestant.name?.charAt(0)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="contestant-info">
              <span className="contestant-name">{contestant.name?.split(' ')[0]}</span>
              <span className="contestant-votes">
                {(contestant.votes || 0).toLocaleString()}
              </span>
            </div>

            {/* Vote button */}
            <button
              className="contestant-vote-btn"
              onClick={(e) => {
                e.stopPropagation();
                openVoteModal(contestant);
              }}
            >
              Vote
            </button>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {(!contestants || contestants.length === 0) && (
        <div className="leaderboard-empty">
          <p>No contestants yet</p>
        </div>
      )}
    </div>
  );
}

export default LeaderboardView;
