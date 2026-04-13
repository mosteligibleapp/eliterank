import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { PortraitCard } from '../components/LeaderboardCompact';

/**
 * Full leaderboard page - reuses the same portrait-card grid as the
 * compact sidebar leaderboard so the two surfaces stay visually consistent.
 * On the full page the grid has more room, so the cards render larger.
 */
export function LeaderboardView() {
  const {
    contestants,
    openVoteModal,
  } = usePublicCompetition();

  return (
    <div className="leaderboard-full">
      <div className="portrait-grid">
        {contestants?.map((contestant, index) => (
          <PortraitCard
            key={contestant.id}
            contestant={contestant}
            rank={contestant.displayRank || index + 1}
            onVote={openVoteModal}
          />
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
