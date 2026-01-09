import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { PrizePool } from '../components/PrizePool';
import { LeaderboardCompact } from '../components/LeaderboardCompact';
import { ActivityFeedCompact } from '../components/ActivityFeedCompact';
import { DailyVoteStatus } from '../components/DailyVoteStatus';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { Timeline } from '../components/Timeline';
import { RulesAccordion } from '../components/RulesAccordion';

/**
 * Voting phase view (Round 1, Round 2, Resurrection, Finals)
 * Main competition view with leaderboard and activity
 */
export function VotingPhase() {
  const {
    phase,
    competition,
    topThree,
    openVoteModal,
  } = usePublicCompetition();

  // Determine phase-specific styling
  const isResurrection = phase?.phase === 'resurrection';
  const isFinals = phase?.phase === 'finals';

  return (
    <div className={`phase-view phase-voting ${isResurrection ? 'phase-resurrection' : ''} ${isFinals ? 'phase-finals' : ''}`}>

      {/* Phase Header */}
      <section className="voting-header">
        <div className="voting-header-content">
          <span className="phase-badge phase-badge-live">
            <span className="badge-dot" />
            {phase?.label}
          </span>
          <h1 className="voting-title">{competition?.name}</h1>
        </div>

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
      </section>

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

          <PrizePool compact />

          <DailyVoteStatus
            hasVote={true}
            onUseVote={() => {
              if (topThree?.[0]) {
                openVoteModal(topThree[0]);
              }
            }}
          />

          <ActivityFeedCompact limit={5} />
        </aside>
      </section>

      {/* Timeline & Rules */}
      <section className="voting-footer">
        <div className="voting-footer-grid">
          <Timeline />
          <RulesAccordion />
        </div>
      </section>
    </div>
  );
}

export default VotingPhase;
