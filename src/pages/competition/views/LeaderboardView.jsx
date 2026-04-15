import { useNavigate, useLocation } from 'react-router-dom';
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

  const navigate = useNavigate();
  const location = useLocation();

  // Top N contestants render the EliteRank crown badge instead of a rank
  // number — where N is the competition's configured winner count.
  const numberOfWinners = competition?.number_of_winners || 1;

  // Between rounds: hide rank badges + vote counts (no active voting).
  const isBetweenRounds = phase?.phase === 'between-rounds';

  // Base competition URL = current path minus any /leaderboard|/activity|/enter
  // tail. Preserves query params like ?preview=between-rounds.
  const basePath = location.pathname
    .replace(/\/(leaderboard|activity|enter)\/?$/, '')
    .replace(/\/$/, '');

  // Between rounds, clicking a contestant navigates to their public
  // profile page (the same URL a contestant would share). Active voting
  // → straight to vote modal.
  const openContestantPage = (contestant) => {
    if (!contestant?.slug) return;
    navigate(`${basePath}/e/${contestant.slug}${location.search || ''}`);
  };
  const handleCardClick = isBetweenRounds ? openContestantPage : openVoteModal;

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
            hideDanger={isBetweenRounds}
            onVote={handleCardClick}
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
