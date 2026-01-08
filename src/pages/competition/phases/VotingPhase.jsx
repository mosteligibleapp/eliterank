import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { PrizePool } from '../components/PrizePool';
import { LeaderboardCompact } from '../components/LeaderboardCompact';
import { ActivityFeedCompact } from '../components/ActivityFeedCompact';
import { DailyVoteStatus } from '../components/DailyVoteStatus';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { AlertTriangle } from 'lucide-react';

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
          <CountdownDisplay label="Voting ends in" />
        </div>

        {/* Elimination warning for applicable rounds */}
        {(phase?.phase === 'round1' || phase?.phase === 'round2') && (
          <div className="elimination-warning">
            <AlertTriangle size={16} />
            <span>Bottom {phase?.phase === 'round1' ? '20%' : '25%'} eliminated when round ends</span>
          </div>
        )}

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
          <PrizePool compact />

          <DailyVoteStatus
            hasVote={true}
            onUseVote={() => {
              if (topThree?.[0]) {
                openVoteModal(topThree[0]);
              }
            }}
          />

          <ActivityFeedCompact limit={4} />
        </aside>
      </section>
    </div>
  );
}

export default VotingPhase;
