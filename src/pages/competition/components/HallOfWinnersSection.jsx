import { Trophy, User } from 'lucide-react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import useAppSettings from '../../../hooks/useAppSettings';

/**
 * Hall of Winners section for competition pages
 * Shows previous season winners on current season competition pages
 * Example: 2025 Most Eligible Atlanta winners shown on 2026 Most Eligible Atlanta page
 * Only displays during Coming Soon and Nominations phases
 */
export function HallOfWinnersSection() {
  const { competition } = usePublicCompetition();

  // Fetch competition-specific hall of winners settings
  const { data: competitionHallOfWinners, loading, error } = useAppSettings('competition_hall_of_winners');

  // Debug logging
  console.log('HallOfWinnersSection Debug:', {
    competitionId: competition?.id,
    loading,
    error,
    allData: competitionHallOfWinners,
    configForThisComp: competitionHallOfWinners?.[competition?.id],
  });

  // Get config for this competition
  const config = competitionHallOfWinners?.[competition?.id];

  // Don't render if no config, not enabled, or no winners
  if (loading || !config?.enabled || !config?.winners?.length) {
    return null;
  }

  const winners = config.winners;
  // Use configured season or default to previous season
  const winnersSeason = config.winnersSeason || (competition?.season ? competition.season - 1 : new Date().getFullYear() - 1);

  return (
    <section className="hall-of-winners-section">
      <div className="hall-of-winners-header">
        <div className="hall-of-winners-icon">
          <Trophy size={20} />
        </div>
        <div className="hall-of-winners-title">
          <span className="hall-of-winners-label">{winnersSeason} Champions</span>
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
