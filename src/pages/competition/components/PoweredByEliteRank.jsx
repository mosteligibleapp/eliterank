import { EliteRankCrown } from '../../../components/ui/icons';

/**
 * Small attribution footer rendered on competition teaser pages.
 *
 * Borrows EliteRank's brand to anchor a brand-new market. Intentionally
 * minimal — no stats, no link — so it reads as a credit, not an ad.
 */
export function PoweredByEliteRank() {
  return (
    <div className="powered-by-eliterank">
      <EliteRankCrown size={14} className="powered-by-eliterank-crown" />
      <span className="powered-by-eliterank-label">Powered by EliteRank</span>
    </div>
  );
}

export default PoweredByEliteRank;
