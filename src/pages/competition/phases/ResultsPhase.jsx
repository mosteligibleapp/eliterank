import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Bell, Trophy, Users, Calendar } from 'lucide-react';
import { WinnersPodium } from '../components/WinnersPodium';
import { PrizePool } from '../components/PrizePool';
import { AboutSection } from '../components/AboutSection';
import { HostSection } from '../components/HostSection';
import { CompetitionHeader } from '../components/CompetitionHeader';
import { formatNumber } from '../../../utils/formatters';

/**
 * Results phase view
 * Shows after competition is complete
 */
export function ResultsPhase() {
  const {
    competition,
    prizePool,
    leaderboardStats,
  } = usePublicCompetition();

  return (
    <div className="phase-view phase-results">
      {/* Competition Header - Consistent across all phases */}
      <CompetitionHeader
        badge="Competition Complete"
        badgeIcon={Trophy}
        badgeVariant="complete"
      />

      {/* Winners Podium */}
      <section className="phase-section">
        <WinnersPodium />
      </section>

      {/* Final Stats */}
      <section className="phase-stats results-stats">
        <div className="stat-card">
          <Trophy size={20} className="stat-icon" />
          <span className="stat-value">{prizePool?.formatted?.totalPrizePool}</span>
          <span className="stat-label">Total Awarded</span>
        </div>
        <div className="stat-card">
          <Users size={20} className="stat-icon" />
          <span className="stat-value">{formatNumber(leaderboardStats?.totalContestants)}</span>
          <span className="stat-label">Contestants</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatNumber(leaderboardStats?.totalVotes)}</span>
          <span className="stat-label">Total Votes</span>
        </div>
      </section>

      {/* Prize Pool Breakdown */}
      <section className="phase-section">
        <PrizePool showLiveBadge={false} />
      </section>

      {/* Next Season CTA */}
      <section className="phase-cta-next-season">
        <div className="next-season-card">
          <Calendar size={32} />
          <h3>Think You Can Win?</h3>
          <p>{competition?.name} {(parseInt(competition?.season) || 2026) + 1} nominations open soon.</p>
          <button className="btn btn-primary">
            <Bell size={16} />
            Get Notified
          </button>
        </div>
      </section>

      <hr className="phase-divider" />

      {/* About */}
      <section className="phase-section">
        <AboutSection />
      </section>

      <hr className="phase-divider" />

      {/* Host & Sponsors */}
      <section className="phase-section">
        <HostSection />
      </section>
    </div>
  );
}

export default ResultsPhase;
