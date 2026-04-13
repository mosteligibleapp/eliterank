import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Crown, Trophy } from 'lucide-react';

/**
 * Winners podium for results phase
 * Regular competitions: large display of top 3 with prizes
 * Legacy competitions: premium card grid of ranked winners
 */
export function WinnersPodium() {
  const { competition, contestants, topThree, prizePool, openContestantProfile } = usePublicCompetition();

  const isLegacy = competition?.is_legacy;

  if (isLegacy) {
    const sorted = [...(contestants || [])].sort((a, b) => (a.rank || 999) - (b.rank || 999)).slice(0, 20);
    if (!sorted.length) return null;
    // Extract year from competition name/slug (e.g. "chicago-2025"), or fall back to end date
    const nameYearMatch = (competition?.name || competition?.slug || '').match(/20\d{2}/);
    const year = nameYearMatch
      ? nameYearMatch[0]
      : competition?.nomination_end
        ? new Date(competition.nomination_end).getFullYear()
        : new Date(competition.created_at).getFullYear();
    return <LegacyContestantsGrid contestants={sorted} onSelect={openContestantProfile} year={year} />;
  }

  if (!topThree?.length) return null;

  // Winner takes all — show only 1st place
  const winner = topThree[0];
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
          onClick={() => openContestantProfile(winner)}
        >
          <div className="winner-place">
            <Crown size={32} />
            <span>Champion</span>
          </div>

          <div className="winner-avatar winner-avatar-large">
            {winner.avatar_url ? (
              <img src={winner.avatar_url} alt={winner.name} />
            ) : (
              <span>{winner.name?.charAt(0)}</span>
            )}
          </div>

          <div className="winner-name">{winner.name}</div>

          <div className="winner-stats">
            <span className="winner-votes">{winner.votes?.toLocaleString()} votes</span>
            <span className="winner-prize">{prizePool?.formatted?.firstPrize}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Premium card grid for legacy competition winners
 * Clean, elevated card design with gold accent and rank badges
 */
function LegacyContestantsGrid({ contestants, onSelect, year }) {
  const isFirst = (index) => index === 0;

  return (
    <div className="legacy-winners-section">
      <div className="legacy-winners-header">
        <Crown size={24} className="legacy-winners-icon" />
        <h2 className="legacy-winners-title">{year} Winners</h2>
      </div>

      <div className="legacy-winners-grid">
        {contestants.map((contestant, index) => (
          <div
            key={contestant.id}
            className={`legacy-winner-card ${isFirst(index) ? 'legacy-winner-card-first' : ''}`}
            onClick={() => onSelect?.(contestant)}
          >
            <div className={`legacy-winner-avatar-wrap ${isFirst(index) ? 'legacy-winner-avatar-wrap-first' : ''}`}>
              {contestant.avatar_url ? (
                <img src={contestant.avatar_url} alt={contestant.name} className="legacy-winner-avatar-img" />
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
