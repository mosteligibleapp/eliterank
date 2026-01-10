import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { PrizePool } from '../components/PrizePool';
import { LeaderboardCompact } from '../components/LeaderboardCompact';
import { ActivityFeedCompact } from '../components/ActivityFeedCompact';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { Timeline } from '../components/Timeline';
import { CompetitionHeader } from '../components/CompetitionHeader';

/**
 * Voting phase view (Round 1, Round 2, Resurrection, Finals)
 * Main competition view with leaderboard and activity
 */
export function VotingPhase() {
  const {
    phase,
  } = usePublicCompetition();

  // Determine phase-specific styling
  const isResurrection = phase?.phase === 'resurrection';
  const isFinals = phase?.phase === 'finals';

  return (
    <div className={`phase-view phase-voting ${isResurrection ? 'phase-resurrection' : ''} ${isFinals ? 'phase-finals' : ''}`}>

      {/* Competition Header - Consistent across all phases */}
      <CompetitionHeader
        badge={phase?.label}
        badgeVariant="live"
      />

      {/* Phase-specific banners */}
      {isResurrection && (
        <div className="resurrection-banner">
          <span>Eliminated contestants compete for 5 wildcard Finals spots</span>
        </div>
      )}

      {isFinals && (
        <div className="finals-banner">
          <span>The final battle for the crown</span>
        </div>
      )}

      {/* Main Content Grid */}
      <section className="voting-grid">
        {/* Leaderboard - Main Column */}
        <div className="voting-main">
          <LeaderboardCompact />
        </div>

        {/* Sidebar */}
        <aside className="voting-sidebar">
          {/* Countdown Timer */}
          <div className="sidebar-countdown">
            <CountdownDisplay label="Round ends in" large />
          </div>

          <PrizePool compact collapsible />

          <ActivityFeedCompact limit={5} />

          <Timeline />
        </aside>
      </section>
    </div>
  );
}

export default VotingPhase;
