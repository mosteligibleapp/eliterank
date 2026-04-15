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
    competition,
    phase,
    openVoteModal,
  } = usePublicCompetition();

  // Top N contestants render the EliteRank crown badge instead of a rank
  // number — where N is the competition's configured winner count.
  const numberOfWinners = competition?.number_of_winners || 1;

  // Between rounds: hide rank badges + vote counts (no active voting).
  const isBetweenRounds = phase?.phase === 'between-rounds';

  return (
    <div className="leaderboard-full">
      <div className="portrait-grid">
        {contestants?.map((contestant, index) => (
          <PortraitCard
            key={contestant.id}
            contestant={contestant}
            rank={contestant.displayRank || index + 1}
            numberOfWinners={numberOfWinners}
            hideRank={isBetweenRounds}
            hideVotes={isBetweenRounds}
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
