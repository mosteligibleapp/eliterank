import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { EliteRankCrown } from '../../../components/ui/icons';

/**
 * Competition page footer showing organization and EliteRank branding
 * No links, just logos and names
 */
export function CompetitionFooter() {
  const { organization } = usePublicCompetition();

  const footerLogo = organization?.header_logo_url || organization?.logo_url;
  const websiteUrl = organization?.website_url;

  return (
    <footer className="competition-footer">
      <div className="competition-footer-items">
        {footerLogo && (
          <div className="competition-footer-item">
            <div className="competition-footer-text">
              <span className="competition-footer-label">Presented by</span>
            </div>
            <div className="competition-footer-logo">
              {websiteUrl ? (
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                  <img src={footerLogo} alt={organization.name} />
                </a>
              ) : (
                <img src={footerLogo} alt={organization.name} />
              )}
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
