import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Clock, Trophy } from 'lucide-react';
import { LeaderboardCompact } from '../components/LeaderboardCompact';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { CompetitionHeader } from '../components/CompetitionHeader';
import { UpcomingEventCard } from '../components/UpcomingEventCard';
import { HostCard } from '../components/HostCard';
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
            Voting Opens In
          </h3>
          <CountdownDisplay label="" large />
        </div>
      </section>

      {/* Current Standings */}
      <section className="phase-section">
        <h3 className="section-label">Current Standings</h3>
        <LeaderboardCompact />
      </section>

      {/* Upcoming Event + Host side-by-side beneath the leaderboard */}
      <section className="phase-section">
        <div className="event-host-row">
          <UpcomingEventCard />
          <HostCard />
        </div>
      </section>

      {/* Judges */}
      <section className="phase-section">
        <JudgesSection />
      </section>
    </div>
  );
}

export default BetweenRoundsPhase;
