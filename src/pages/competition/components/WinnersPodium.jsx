import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Trophy } from 'lucide-react';
import EliteRankCrown from '../../../components/ui/icons/EliteRankCrown';
import { transformSupabaseImage } from '../../../lib/storageImage';

/**
 * Winners podium for results phase
 * Single-winner competitions: large spotlight on the champion
 * Multi-winner / legacy competitions: premium card grid of ranked winners
 */
export function WinnersPodium() {
  const { competition, contestants, topThree, prizePool, openContestantProfile } = usePublicCompetition();
  const navigate = useNavigate();
  const location = useLocation();

  // Clicking a contestant card navigates to their shareable public profile.
  // Preserve ?preview= so phase previews carry through to the profile.
  const handleContestantClick = useCallback((contestant) => {
    if (contestant.user_id) {
      navigate(`/profile/${contestant.user_id}${location.search || ''}`);
    } else {
      openContestantProfile(contestant);
    }
  }, [openContestantProfile, navigate, location.search]);

  const isLegacy = competition?.is_legacy;

  if (isLegacy) {
    const sorted = [...(contestants || [])].sort((a, b) => (a.rank || 999) - (b.rank || 999)).slice(0, 10);
    if (!sorted.length) return null;
    // Prefer the competition's configured season; fall back to slug/name
    // parsing only if it isn't set. Avoids the "SEASON 2025" + "2026
    // Winners" mismatch when the slug happens to contain a different year.
    const nameYearMatch = (competition?.name || competition?.slug || '').match(/20\d{2}/);
    const year = competition?.season
      ?? (nameYearMatch
        ? nameYearMatch[0]
        : competition?.nomination_end
          ? new Date(competition.nomination_end).getFullYear()
          : competition?.created_at
            ? new Date(competition.created_at).getFullYear()
            : null);
    return <WinnersGrid winners={sorted} onSelect={handleContestantClick} year={year} />;
  }

  // Multi-winner competitions (e.g. a Top 5) showcase every crowned winner in
  // the ranked grid; classic winner-take-all competitions keep the single
  // champion spotlight. The authoritative winner set + order comes from
  // competitions.winners (written by finalize_voting_round); we fall back to
  // the top-ranked contestants when that array isn't populated yet (e.g. a host
  // previewing the results phase before the finale closes).
  const numberOfWinners = competition?.number_of_winners || 1;
  const byId = new Map((contestants || []).map((c) => [c.id, c]));
  const winnerIds = Array.isArray(competition?.winners) ? competition.winners : [];
  let winners = winnerIds.map((id) => byId.get(id)).filter(Boolean);
  if (!winners.length) {
    const crowned = (contestants || []).filter((c) => c.status === 'winner');
    winners = (crowned.length ? crowned : (contestants || [])).slice(0, numberOfWinners);
  }

  if (numberOfWinners > 1 && winners.length > 1) {
    // Showcase up to 10: the official winners first, then the next
    // top-ranked contestants (runners-up) shown far less prominently.
    const showcase = [...winners];
    if (showcase.length < 10) {
      const have = new Set(showcase.map((c) => c.id));
      const rest = (contestants || [])
        .filter((c) => !have.has(c.id))
        .sort((a, b) => (a.rank || 999) - (b.rank || 999) || (b.votes || 0) - (a.votes || 0));
      showcase.push(...rest.slice(0, 10 - showcase.length));
    }
    return <WinnersGrid winners={showcase} onSelect={handleContestantClick} year={competition?.season} />;
  }

  // Winner takes all — show only 1st place
  const winner = winners[0] || topThree?.[0];
  if (!winner) return null;

  return (
    <div className="winners-podium">
      <div className="podium-header">
        <Trophy size={32} className="podium-trophy" />
        <h2>Winner</h2>
      </div>

      <div className="podium-display">
        <div
          key={winner.id}
          className="podium-winner podium-winner-1 first-place"
          onClick={() => handleContestantClick(winner)}
        >
          <div className="winner-place">
            <EliteRankCrown size={32} />
            <span>Champion</span>
          </div>

          <div className="winner-avatar winner-avatar-large">
            {winner.avatar_url ? (
              <img src={transformSupabaseImage(winner.avatar_url, { width: 300, height: 300 })} alt={winner.name} />
            ) : (
              <span>{winner.name?.charAt(0)}</span>
            )}
          </div>

          <div className="winner-name">{winner.name}</div>

          <div className="winner-stats">
            <span className="winner-votes">{winner.votes?.toLocaleString()} votes</span>
            {prizePool && (
              <span className="winner-prize">{prizePool.formatted.firstPrize}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Premium card grid for multi-winner (and legacy) competitions.
 * Clean, elevated card design with gold accent and rank badges; the first card
 * (rank #1) gets the highlighted treatment.
 */
function WinnersGrid({ winners, onSelect, year }) {
  const topFive = winners.slice(0, 5);
  const runnersUp = winners.slice(5, 10);

  const renderCard = (contestant, extraClass = '') => (
    <div
      key={contestant.id}
      className={`legacy-winner-card ${extraClass}`}
      onClick={() => onSelect?.(contestant)}
    >
      {contestant.avatar_url ? (
        <img
          src={transformSupabaseImage(contestant.avatar_url, { width: 300, height: 400 })}
          alt={contestant.name}
          className="legacy-winner-photo"
        />
      ) : (
        <div className="legacy-winner-photo legacy-winner-photo-fallback">
          {contestant.name?.charAt(0)}
        </div>
      )}
      <div className="legacy-winner-overlay">
        <span className="legacy-winner-name">{contestant.name}</span>
      </div>
    </div>
  );

  return (
    <div className="legacy-winners-section">
      <div className="legacy-winners-header">
        <EliteRankCrown size={24} className="legacy-winners-icon" />
        <h2 className="legacy-winners-title">{year} Winners</h2>
      </div>

      <div className="legacy-winners-grid">
        {topFive.map((contestant, index) => renderCard(contestant, index < 2 ? 'legacy-winner-card-top' : ''))}
      </div>

      {runnersUp.length > 0 && (
        <>
          <h3 className="legacy-winners-subheader">Top 10</h3>
          <div className="legacy-winners-grid legacy-winners-grid-minor">
            {runnersUp.map((contestant) => renderCard(contestant))}
          </div>
        </>
      )}
    </div>
  );
}

export default WinnersPodium;
