import { Crown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import useAppSettings from '../../../hooks/useAppSettings';

/**
 * Premium Hall of Winners Section
 * Podium-style layout celebrating past champions
 */
export function HallOfWinnersSection() {
  const { competition } = usePublicCompetition();
  const navigate = useNavigate();

  const { data: hallOfWinners, loading } = useAppSettings('hall_of_winners');

  const shouldDisplay = hallOfWinners?.displayOnCompetitions?.includes(competition?.id);

  if (loading || !hallOfWinners || !shouldDisplay || !hallOfWinners.winners?.length) {
    return null;
  }

  const { winners, year } = hallOfWinners;

  // Split winners into tiers
  const champion = winners[0];
  const runnerUps = winners.slice(1, 3);
  const finalists = winners.slice(3, 5);

  const handleWinnerClick = (winner) => {
    if (winner.profileId) {
      navigate(`/profile/${winner.profileId}`);
    }
  };

  return (
    <section className="hall-of-winners">
      {/* Header */}
      <div className="hall-of-winners__header">
        <div className="hall-of-winners__badge">
          <Sparkles size={14} />
          <span>{year} Champions</span>
        </div>
        <h2 className="hall-of-winners__title">Hall of Winners</h2>
      </div>

      {/* Podium Layout */}
      <div className="hall-of-winners__podium">
        {/* Runner-up #2 (left) */}
        {runnerUps[0] && (
          <WinnerCard
            winner={runnerUps[0]}
            rank={2}
            size="medium"
            onClick={() => handleWinnerClick(runnerUps[0])}
          />
        )}

        {/* Champion #1 (center, featured) */}
        {champion && (
          <WinnerCard
            winner={champion}
            rank={1}
            size="large"
            featured
            onClick={() => handleWinnerClick(champion)}
          />
        )}

        {/* Runner-up #3 (right) */}
        {runnerUps[1] && (
          <WinnerCard
            winner={runnerUps[1]}
            rank={3}
            size="medium"
            onClick={() => handleWinnerClick(runnerUps[1])}
          />
        )}
      </div>

      {/* Finalists Row */}
      {finalists.length > 0 && (
        <div className="hall-of-winners__finalists">
          {finalists.map((winner, idx) => (
            <WinnerCard
              key={winner.id}
              winner={winner}
              rank={idx + 4}
              size="small"
              onClick={() => handleWinnerClick(winner)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Individual Winner Card Component
 */
function WinnerCard({ winner, rank, size = 'medium', featured = false, onClick }) {
  const isClickable = !!winner.profileId;

  return (
    <div
      className={`winner-card winner-card--${size} ${featured ? 'winner-card--featured' : ''}`}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Image Container */}
      <div className="winner-card__image-container">
        {winner.imageUrl ? (
          <img
            src={winner.imageUrl}
            alt={winner.name}
            className="winner-card__image"
            loading="lazy"
          />
        ) : (
          <div className="winner-card__placeholder">
            {winner.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="winner-card__gradient" />

        {/* Crown Badge for #1 */}
        {rank === 1 && (
          <div className="winner-card__crown">
            <Crown size={featured ? 18 : 14} />
          </div>
        )}

        {/* Rank Badge for #2-5 */}
        {rank > 1 && (
          <div className="winner-card__rank">#{rank}</div>
        )}

        {/* Name Overlay */}
        <div className="winner-card__info">
          <span className="winner-card__name">{winner.name}</span>
          {featured && (
            <span className="winner-card__label">Champion</span>
          )}
        </div>
      </div>

      {/* Glow Effect (featured only) */}
      {featured && <div className="winner-card__glow" />}
    </div>
  );
}

export default HallOfWinnersSection;
