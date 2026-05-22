import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { EliteRankCrown } from '../../../components/ui/icons';
import { transformSupabaseImage } from '../../../lib/storageImage';

/**
 * Competition page footer showing organization and EliteRank branding
 * No links, just logos and names
 */
export function CompetitionFooter() {
  const { organization } = usePublicCompetition();

  return (
    <footer className="competition-footer">
      <div className="competition-footer-items">
        {organization?.logo_url && (
          <div className="competition-footer-item">
            <div className="competition-footer-logo">
              <img
                src={transformSupabaseImage(organization.logo_url, { width: 300 })}
                alt={organization.name}
                decoding="async"
                loading="lazy"
              />
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
