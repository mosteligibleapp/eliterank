import { Link } from 'react-router-dom';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { EliteRankCrown } from '../../../components/ui/icons';
import { RulesAccordion } from './RulesAccordion';

/**
 * Competition page footer.
 *
 * Rendered once at the layout level so it appears on every phase and
 * sub-view. Contains the official rules (as a collapsible accordion),
 * a participation agreement linking out to ToS/Privacy, and the
 * organization + EliteRank branding row.
 */
export function CompetitionFooter() {
  const {
    organization,
    competition,
    votingRounds,
    about,
    events,
  } = usePublicCompetition();

  // Skip rendering on error/loading screens where there's no competition data.
  if (!competition) return null;

  return (
    <footer className="competition-footer">
      <div className="competition-footer-rules">
        <RulesAccordion
          competition={competition}
          votingRounds={votingRounds}
          about={about}
          events={events}
        />
      </div>

      <div className="competition-footer-agreement">
        <h4 className="competition-footer-agreement-title">Participation Agreement</h4>
        <p className="competition-footer-agreement-body">
          By entering, nominating, voting, or otherwise participating in this
          competition, you acknowledge that you have read and agree to abide by
          the Official Rules above, the{' '}
          <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</Link>
          {', and '}
          <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>
          . Rules, prizes, and eligibility are subject to change at the host&rsquo;s
          discretion. Void where prohibited.
        </p>
      </div>

      <div className="competition-footer-items">
        {organization?.logo_url && (
          <div className="competition-footer-item">
            <div className="competition-footer-logo">
              <img src={organization.logo_url} alt={organization.name} />
            </div>
            <div className="competition-footer-text">
              <span className="competition-footer-label">Presented by</span>
              <span className="competition-footer-name">{organization.name}</span>
            </div>
          </div>
        )}

        <div className="competition-footer-item">
          <div className="competition-footer-logo competition-footer-logo-eliterank">
            <EliteRankCrown size={20} />
          </div>
          <div className="competition-footer-text">
            <span className="competition-footer-label">Powered by</span>
            <span className="competition-footer-name">EliteRank</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default CompetitionFooter;
