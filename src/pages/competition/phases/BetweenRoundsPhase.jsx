import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Clock, Trophy } from 'lucide-react';
import { PrizePool } from '../components/PrizePool';
import { LeaderboardCompact } from '../components/LeaderboardCompact';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { Timeline } from '../components/Timeline';
import { CompetitionHeader } from '../components/CompetitionHeader';

/**
 * Between rounds phase view
 * Shows between voting rounds
 */
export function BetweenRoundsPhase() {
  const { phase } = usePublicCompetition();

  return (
    <div className="phase-view phase-between-rounds">
      {/* Competition Header - Consistent across all phases */}
      <CompetitionHeader
        badge="Between Rounds"
        badgeIcon={Clock}
        badgeVariant="default"
      />

      {/* Next Round Countdown */}
      <section className="phase-section between-rounds-countdown">
        <div className="next-round-card">
          <h3>
            <Trophy size={20} />
            {phase?.nextRound?.title || 'Next Round'} Starts Soon
          </h3>
          <CountdownDisplay label="" large />
        </div>
      </section>

      {/* Current Standings */}
      <section className="phase-grid phase-grid-2">
        <div>
          <h3 className="section-label">Current Standings</h3>
          <LeaderboardCompact />
        </div>
        <div>
          <PrizePool />
          <Timeline />
        </div>
      </section>
    </div>
  );
}

export default BetweenRoundsPhase;
