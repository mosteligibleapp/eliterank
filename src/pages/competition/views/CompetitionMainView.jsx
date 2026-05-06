import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { ComingSoonPhase } from '../phases/ComingSoonPhase';
import { NominationsPhase } from '../phases/NominationsPhase';
import { VotingPhase } from '../phases/VotingPhase';
import { ResultsPhase } from '../phases/ResultsPhase';
import { BetweenRoundsPhase } from '../phases/BetweenRoundsPhase';

/**
 * Main competition view - renders appropriate phase component
 */
export function CompetitionMainView() {
  const { phase } = usePublicCompetition();

  switch (phase?.phase) {
    case 'coming-soon':
      return <ComingSoonPhase />;

    case 'nominations':
      return <NominationsPhase />;

    case 'voting':
    case 'resurrection':
    case 'finals':
      return <VotingPhase />;

    case 'results':
      return <ResultsPhase />;

    case 'between-rounds':
      return <BetweenRoundsPhase />;

    default:
      return (
        <div className="phase-view phase-unknown">
          <div className="phase-content">
            <h2>Competition</h2>
            <p>Phase: {phase?.phase || 'loading'}</p>
          </div>
        </div>
      );
  }
}

export default CompetitionMainView;
