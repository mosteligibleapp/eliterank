import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Crown, Award, Medal, Trophy } from 'lucide-react';

/**
 * Winners podium for results phase
 * Large display of top 3 with prizes
 */
export function WinnersPodium() {
  const { topThree, prizePool, orgSlug, citySlug, year } = usePublicCompetition();

  // Build profile URL for winner
  const getProfileUrl = (winner) => {
    const basePath = year
      ? `/c/${orgSlug}/${citySlug}/${year}`
      : `/c/${orgSlug}/${citySlug}`;
    return `${basePath}/e/${winner.slug || winner.id}`;
  };

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
            <a
              key={winner.id}
              href={getProfileUrl(winner)}
              target="_blank"
              rel="noopener noreferrer"
              className={`podium-winner podium-winner-${index + 1} ${isFirst ? 'first-place' : ''}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
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
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default WinnersPodium;
