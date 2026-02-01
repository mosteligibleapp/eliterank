import { Trophy, User } from 'lucide-react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import useAppSettings from '../../../hooks/useAppSettings';

/**
 * Hall of Winners section for competition pages
 * Shows the explore page Hall of Winners on selected competition pages
 * Only displays during Coming Soon and Nominations phases
 */
export function HallOfWinnersSection() {
  const { competition } = usePublicCompetition();

  // Fetch hall of winners settings (same as explore page)
  const { data: hallOfWinners, loading } = useAppSettings('hall_of_winners');

  // Check if this competition should display the Hall of Winners
  const shouldDisplay = hallOfWinners?.displayOnCompetitions?.includes(competition?.id);

  // Don't render if loading, no data, not enabled for this competition, or no winners
  if (loading || !hallOfWinners || !shouldDisplay || !hallOfWinners.winners?.length) {
    return null;
  }

  const { winners, year } = hallOfWinners;

  return (
    <section className="hall-of-winners-section">
      <div className="hall-of-winners-header">
        <div className="hall-of-winners-icon">
          <Trophy size={20} />
        </div>
        <div className="hall-of-winners-title">
          <span className="hall-of-winners-label">{year} Champions</span>
          <h3>Hall of Winners</h3>
        </div>
      </div>

      <div className="hall-of-winners-grid">
        {winners.slice(0, 5).map((winner, index) => (
          <div key={winner.id} className="hall-of-winners-card">
            <div className="hall-of-winners-rank">{index + 1}</div>
            <div className="hall-of-winners-avatar">
              {winner.imageUrl ? (
                <img src={winner.imageUrl} alt={winner.name} />
              ) : (
                <User size={20} />
              )}
            </div>
            <div className="hall-of-winners-info">
              <p className="hall-of-winners-name">{winner.name}</p>
              {winner.city && (
                <p className="hall-of-winners-city">{winner.city}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HallOfWinnersSection;
