import { useState } from 'react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Trophy, Crown, Award, Medal, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Prize Pool display component
 * Shows total pool and breakdown by place
 *
 * @param {boolean} compact - Smaller version for sidebar
 * @param {boolean} collapsible - Can expand/collapse to show breakdown
 * @param {boolean} showLiveBadge - Show "LIVE" indicator
 */
export function PrizePool({ compact = false, collapsible = false, showLiveBadge = true }) {
  const { prizePool, phase } = usePublicCompetition();
  const [expanded, setExpanded] = useState(false);

  if (!prizePool) return null;

  const isPreVoting = phase?.phase === 'coming-soon' || phase?.phase === 'nominations';
  const isComplete = phase?.phase === 'results';

  // Determine subtitle based on phase
  const subtitle = isPreVoting
    ? 'Starting pool · grows with votes'
    : isComplete
    ? 'Final prize pool'
    : 'Growing with every vote';

  // Breakdown component - reusable
  const PrizeBreakdown = () => (
    <div className="prize-pool-breakdown">
      <div className="prize-tier prize-tier-first">
        <div className="prize-tier-label">
          <Crown size={16} className="prize-icon prize-gold" />
          <span>1st Place</span>
        </div>
        <div className="prize-tier-amount prize-gold">{prizePool.formatted.firstPrize}</div>
      </div>

      <div className="prize-tier prize-tier-second">
        <div className="prize-tier-label">
          <Award size={16} className="prize-icon prize-silver" />
          <span>2nd Place</span>
        </div>
        <div className="prize-tier-amount">{prizePool.formatted.secondPrize}</div>
      </div>

      <div className="prize-tier prize-tier-third">
        <div className="prize-tier-label">
          <Medal size={16} className="prize-icon prize-bronze" />
          <span>3rd Place</span>
        </div>
        <div className="prize-tier-amount">{prizePool.formatted.thirdPrize}</div>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className={`prize-pool prize-pool-compact ${collapsible ? 'prize-pool-collapsible' : ''}`}>
        <button
          className="prize-pool-header"
          onClick={() => collapsible && setExpanded(!expanded)}
          disabled={!collapsible}
        >
          <div className="prize-pool-label">
            <Trophy size={14} />
            <span>Prize Pool</span>
          </div>
          <div className="prize-pool-header-right">
            {showLiveBadge && phase?.isVoting && (
              <span className="live-badge">
                <span className="live-dot" />
                LIVE
              </span>
            )}
            {collapsible && (
              expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />
            )}
          </div>
        </button>
        <div className="prize-pool-total">{prizePool.formatted.totalPrizePool}</div>
        <div className="prize-pool-subtitle">{subtitle}</div>

        {collapsible && expanded && <PrizeBreakdown />}
      </div>
    );
  }

  return (
    <div className="prize-pool">
      <div className="prize-pool-header">
        <div className="prize-pool-label">
          <Trophy size={16} />
          <span>Prize Pool</span>
        </div>
        {showLiveBadge && phase?.isVoting && (
          <span className="live-badge">
            <span className="live-dot" />
            LIVE
          </span>
        )}
      </div>

      <div className="prize-pool-total">{prizePool.formatted.totalPrizePool}</div>
      <div className="prize-pool-subtitle">{subtitle}</div>

      <PrizeBreakdown />
    </div>
  );
}

export default PrizePool;
