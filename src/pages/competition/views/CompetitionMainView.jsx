import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';

/**
 * Main competition view - renders appropriate phase
 */
export function CompetitionMainView() {
  const { phase } = usePublicCompetition();

  // Render phase-specific content
  switch (phase?.phase) {
    case 'coming-soon':
      return <ComingSoonPlaceholder />;

    case 'nominations':
      return <NominationsPlaceholder />;

    case 'round1':
    case 'round2':
    case 'round3':
    case 'round4':
    case 'resurrection':
    case 'finals':
      return <VotingPlaceholder />;

    case 'results':
      return <ResultsPlaceholder />;

    case 'between-rounds':
      return <BetweenRoundsPlaceholder />;

    default:
      return (
        <div className="phase-unknown">
          <p>Unknown phase: {phase?.phase || 'loading'}</p>
        </div>
      );
  }
}

// Temporary placeholders - replace with actual components in Phase 5

function ComingSoonPlaceholder() {
  const { competition, about, prizePool, countdown } = usePublicCompetition();

  return (
    <div className="phase-coming-soon">
      <div className="phase-content">
        <h2>Coming Soon</h2>
        <p className="competition-name">{competition?.city}</p>
        <p className="prize-pool">
          Prize Pool: {prizePool?.formatted?.totalPrizePool}
        </p>
        {about?.description && (
          <p className="about-description">{about.description}</p>
        )}
        {countdown && !countdown.isExpired && (
          <p className="countdown">
            Nominations open in: {countdown.display?.full}
          </p>
        )}
        <p className="placeholder-note">Phase 5: Build full Coming Soon view</p>
      </div>
    </div>
  );
}

function NominationsPlaceholder() {
  const { competition, about, prizePool, countdown } = usePublicCompetition();

  return (
    <div className="phase-nominations">
      <div className="phase-content">
        <h2>Nominations Open</h2>
        <p className="competition-name">{competition?.city}</p>
        <p className="prize-pool">
          Prize Pool: {prizePool?.formatted?.totalPrizePool}
        </p>
        {countdown && !countdown.isExpired && (
          <p className="countdown">Closes in: {countdown.display?.full}</p>
        )}
        <p className="placeholder-note">
          Phase 5: Build full Nominations view
        </p>
      </div>
    </div>
  );
}

function VotingPlaceholder() {
  const { competition, phase, prizePool, contestants, topThree } =
    usePublicCompetition();

  return (
    <div className="phase-voting">
      <div className="phase-content">
        <h2>{phase?.label}</h2>
        <p className="competition-name">{competition?.city}</p>
        <p className="prize-pool">
          Prize Pool: {prizePool?.formatted?.totalPrizePool}
        </p>
        <p className="contestant-count">Contestants: {contestants?.length}</p>
        {topThree?.[0] && <p className="leader">Leader: {topThree[0].name}</p>}
        <p className="placeholder-note">Phase 5: Build full Voting view</p>
      </div>
    </div>
  );
}

function ResultsPlaceholder() {
  const { competition, prizePool, topThree } = usePublicCompetition();

  return (
    <div className="phase-results">
      <div className="phase-content">
        <h2>Results</h2>
        <p className="competition-name">{competition?.city}</p>
        <p className="prize-pool">
          Final Prize Pool: {prizePool?.formatted?.totalPrizePool}
        </p>
        {topThree?.[0] && <p className="winner">Winner: {topThree[0].name}</p>}
        <p className="placeholder-note">Phase 5: Build full Results view</p>
      </div>
    </div>
  );
}

function BetweenRoundsPlaceholder() {
  const { phase, countdown } = usePublicCompetition();

  return (
    <div className="phase-between-rounds">
      <div className="phase-content">
        <h2>Between Rounds</h2>
        {phase?.nextRound && <p>Next: {phase.nextRound.title}</p>}
        {countdown && !countdown.isExpired && (
          <p className="countdown">Starts in: {countdown.display?.full}</p>
        )}
        <p className="placeholder-note">
          Phase 5: Build full Between Rounds view
        </p>
      </div>
    </div>
  );
}

export default CompetitionMainView;
