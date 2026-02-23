import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { useAuthContextSafe } from '../../../contexts/AuthContext';
import { PrizePool } from '../components/PrizePool';
import { LeaderboardCompact } from '../components/LeaderboardCompact';
import { ActivityFeedCompact } from '../components/ActivityFeedCompact';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { Timeline } from '../components/Timeline';
import { CompetitionHeader } from '../components/CompetitionHeader';
import { UpcomingEventCard } from '../components/UpcomingEventCard';
import ContestantBonusVotes from '../components/ContestantBonusVotes';

/**
 * Voting phase view (Round 1, Round 2, Resurrection, Finals)
 * Main competition view with leaderboard and activity
 */
export function VotingPhase() {
  const {
    phase,
    competition,
    contestants,
  } = usePublicCompetition();

  const { user } = useAuthContextSafe();

  // Determine phase-specific styling
  const isResurrection = phase?.phase === 'resurrection';
  const isFinals = phase?.phase === 'finals';

  // Check if current user is a contestant in this competition
  const currentContestant = user
    ? contestants?.find(c => c.user_id === user.id)
    : null;

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

          {/* Bonus Votes Checklist - shown to contestants */}
          {currentContestant && competition?.id && (
            <ContestantBonusVotes
              competitionId={competition.id}
              contestantId={currentContestant.id}
              userId={user.id}
            />
          )}

          <PrizePool compact collapsible />

          <ActivityFeedCompact limit={5} />

          <UpcomingEventCard />

          <Timeline />
        </aside>
      </section>
    </div>
  );
}

export default VotingPhase;
