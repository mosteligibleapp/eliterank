import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Trophy } from 'lucide-react';
import { LeaderboardCompact } from '../components/LeaderboardCompact';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { CompetitionHeader } from '../components/CompetitionHeader';
import { UpcomingEventCard } from '../components/UpcomingEventCard';
import { HostSection } from '../components/HostSection';
import { JudgesSection } from '../components/JudgesSection';

/**
 * Between rounds phase view
 * Shows between voting rounds
 */
export function BetweenRoundsPhase() {
  const { phase } = usePublicCompetition();

  return (
    <div className="phase-view phase-between-rounds">
      {/* Competition Header - Consistent across all phases */}
      <CompetitionHeader />

      {/* Next Round Countdown */}
      <section className="phase-section between-rounds-countdown">
        <div className="next-round-card">
          <h3>
            <Trophy size={20} />
            Voting Opens Soon
          </h3>
          <CountdownDisplay label="" large />
        </div>
      </section>

      {/* Current Standings */}
      <section className="phase-section">
        <h3 className="section-label">Current Standings</h3>
        <LeaderboardCompact />
      </section>

      {/* Upcoming Event + Host Profile side by side */}
      <section className="phase-section phase-grid phase-grid-2">
        <UpcomingEventCard />
        <HostSection />
      </section>

      {/* Judges Panel */}
      <section className="phase-section">
        <JudgesSection />
      </section>
    </div>
  );
}

export default BetweenRoundsPhase;
