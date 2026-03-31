import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Crown, Award, Medal, Trophy } from 'lucide-react';

/**
 * Winners podium for results phase
 * Large display of top 3 with prizes
 * Falls back to legacy_winners for past competitions hosted outside EliteRank
 */
export function WinnersPodium() {
  const { competition, topThree, prizePool, openContestantProfile } = usePublicCompetition();

  const legacyWinners = competition?.legacy_winners || [];
  const isLegacy = competition?.is_legacy && legacyWinners.length > 0;

  // Use legacy winners if no real contestants
  if (isLegacy) {
    return <LegacyWinnersPodium winners={legacyWinners} />;
  }

  if (!topThree?.length) return null;

  const prizes = [
    prizePool?.formatted?.firstPrize,
    prizePool?.formatted?.secondPrize,
    prizePool?.formatted?.thirdPrize,
  ];

  const icons = [Crown, Award, Medal];
  const labels = ['Champion', '2nd Place', '3rd Place'];

  return (
    <div className="winners-podium">
      <div className="podium-header">
        <Trophy size={32} className="podium-trophy" />
        <h2>Winners</h2>
      </div>

      <div className="podium-display">
        {/* Reorder for visual: 2nd, 1st, 3rd */}
        {[1, 0, 2].map(index => {
          const winner = topThree[index];
          if (!winner) return null;

          const Icon = icons[index];
          const isFirst = index === 0;

          return (
            <div
              key={winner.id}
              className={`podium-winner podium-winner-${index + 1} ${isFirst ? 'first-place' : ''}`}
              onClick={() => openContestantProfile(winner)}
            >
              <div className="winner-place">
                <Icon size={isFirst ? 32 : 24} />
                <span>{labels[index]}</span>
              </div>

              <div className={`winner-avatar ${isFirst ? 'winner-avatar-large' : ''}`}>
                {winner.avatar_url ? (
                  <img src={winner.avatar_url} alt={winner.name} />
                ) : (
                  <span>{winner.name?.charAt(0)}</span>
                )}
              </div>

              <div className="winner-name">{winner.name}</div>

              <div className="winner-stats">
                <span className="winner-votes">{winner.votes?.toLocaleString()} votes</span>
                <span className="winner-prize">{prizes[index]}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Simplified podium for legacy competitions
 * Displays all winners in a grid with rank badges
 */
function LegacyWinnersPodium({ winners }) {
  const sorted = [...winners].sort((a, b) => (a.rank || 0) - (b.rank || 0));
  const icons = [Crown, Award, Medal];
  const labels = ['Champion', '2nd Place', '3rd Place', '4th Place', '5th Place'];

  return (
    <div className="winners-podium">
      <div className="podium-header">
        <Trophy size={32} className="podium-trophy" />
        <h2>Winners</h2>
      </div>

      <div className="podium-display legacy-podium-display">
        {sorted.map((winner, index) => {
          const Icon = icons[index] || Medal;
          const isFirst = index === 0;

          return (
            <div
              key={index}
              className={`podium-winner podium-winner-${index + 1} ${isFirst ? 'first-place' : ''}`}
            >
              <div className="winner-place">
                <Icon size={isFirst ? 32 : 24} />
                <span>{labels[index] || `#${index + 1}`}</span>
              </div>

              <div className={`winner-avatar ${isFirst ? 'winner-avatar-large' : ''}`}>
                {winner.imageUrl ? (
                  <img src={winner.imageUrl} alt={winner.name} />
                ) : (
                  <span>{winner.name?.charAt(0)}</span>
                )}
              </div>

              <div className="winner-name">{winner.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WinnersPodium;
