import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Clock, Trophy } from 'lucide-react';
import { PrizePool } from '../components/PrizePool';
import { LeaderboardCompact } from '../components/LeaderboardCompact';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { Timeline } from '../components/Timeline';

/**
 * Between rounds phase view
 * Shows between voting rounds
 */
export function BetweenRoundsPhase() {
  const { competition, phase } = usePublicCompetition();

  return (
    <div className="phase-view phase-between-rounds">
      {/* Hero */}
      <section className="phase-hero">
        <span className="phase-badge">
          <Clock size={14} />
          Between Rounds
        </span>
        <h1 className="phase-title">{competition?.name}</h1>
        <h2 className="phase-subtitle">{competition?.city}</h2>
      </section>

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
