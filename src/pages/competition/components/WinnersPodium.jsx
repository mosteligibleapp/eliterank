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
    const sorted = [...(contestants || [])].sort((a, b) => (a.rank || 999) - (b.rank || 999)).slice(0, 20);
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
    return <WinnersGrid winners={winners} onSelect={handleContestantClick} year={competition?.season} />;
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
  const isFirst = (index) => index === 0;

  return (
    <div className="legacy-winners-section">
      <div className="legacy-winners-header">
        <EliteRankCrown size={24} className="legacy-winners-icon" />
        <h2 className="legacy-winners-title">{year} Winners</h2>
      </div>

      <div className="legacy-winners-grid">
        {winners.map((contestant, index) => (
          <div
            key={contestant.id}
            className={`legacy-winner-card ${isFirst(index) ? 'legacy-winner-card-first' : ''}`}
            onClick={() => onSelect?.(contestant)}
          >
            <div className={`legacy-winner-avatar-wrap ${isFirst(index) ? 'legacy-winner-avatar-wrap-first' : ''}`}>
              {contestant.avatar_url ? (
                <img src={transformSupabaseImage(contestant.avatar_url, { width: 200, height: 200 })} alt={contestant.name} className="legacy-winner-avatar-img" />
              ) : (
                <span className="legacy-winner-avatar-fallback">{contestant.name?.charAt(0)}</span>
              )}
            </div>
            <div className="legacy-winner-info">
              <span className={`legacy-winner-rank ${isFirst(index) ? 'legacy-winner-rank-first' : ''}`}>
                {index + 1}
              </span>
              <span className="legacy-winner-name">{contestant.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WinnersPodium;
