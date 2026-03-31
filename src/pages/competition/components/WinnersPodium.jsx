import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Crown, Award, Medal, Trophy } from 'lucide-react';

/**
 * Winners podium for results phase
 * Regular competitions: large display of top 3 with prizes
 * Legacy competitions: grid display of up to 20 ranked contestants
 */
export function WinnersPodium() {
  const { competition, contestants, topThree, prizePool, openContestantProfile } = usePublicCompetition();

  const isLegacy = competition?.is_legacy;

  if (isLegacy) {
    const sorted = [...(contestants || [])].sort((a, b) => (a.rank || 999) - (b.rank || 999)).slice(0, 20);
    if (!sorted.length) return null;
    return <LegacyContestantsGrid contestants={sorted} onSelect={openContestantProfile} />;
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
 * Grid display for legacy competition contestants
 * Shows up to 20 contestants with rank badges and avatars
 */
function LegacyContestantsGrid({ contestants, onSelect }) {
  return (
    <div className="winners-podium">
      <div className="podium-header">
        <Trophy size={32} className="podium-trophy" />
        <h2>Results</h2>
      </div>

      <div className="legacy-contestants-grid">
        {contestants.map((contestant, index) => (
          <div
            key={contestant.id}
            className="legacy-contestant-card"
            onClick={() => onSelect?.(contestant)}
          >
            <div className="legacy-contestant-rank">{index + 1}</div>
            <div className="legacy-contestant-avatar">
              {contestant.avatar_url ? (
                <img src={contestant.avatar_url} alt={contestant.name} />
              ) : (
                <span>{contestant.name?.charAt(0)}</span>
              )}
            </div>
            <div className="legacy-contestant-name">{contestant.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WinnersPodium;
