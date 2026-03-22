import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { EliteRankCrown } from '../../../components/ui/icons';

/**
 * Competition page footer showing organization and EliteRank branding
 * No links, just logos and names
 */
export function CompetitionFooter() {
  const { organization } = usePublicCompetition();

  const websiteUrl = organization?.website_url;

  const orgLogoContent = organization?.logo_url ? (
    <div className="competition-footer-logo">
      <img src={organization.logo_url} alt={organization.name} />
    </div>
  ) : null;

  return (
    <footer className="competition-footer">
      <div className="competition-footer-items">
        {organization?.logo_url && (
          <div className="competition-footer-item">
            {websiteUrl ? (
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 'inherit', textDecoration: 'none', color: 'inherit' }}>
                {orgLogoContent}
                <div className="competition-footer-text">
                  <span className="competition-footer-label">Presented by</span>
                  <span className="competition-footer-name">{organization.name}</span>
                </div>
              </a>
            ) : (
              <>
                {orgLogoContent}
                <div className="competition-footer-text">
                  <span className="competition-footer-label">Presented by</span>
                  <span className="competition-footer-name">{organization.name}</span>
                </div>
              </>
            )}
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
