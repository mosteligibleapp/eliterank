import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Trophy, Crown, Award, Medal } from 'lucide-react';

/**
 * Prize Pool display component
 * Shows total pool and breakdown by place
 *
 * @param {boolean} compact - Smaller version for sidebar
 * @param {boolean} showLiveBadge - Show "LIVE" indicator
 */
export function PrizePool({ compact = false, showLiveBadge = true }) {
  const { prizePool, phase } = usePublicCompetition();

  if (!prizePool) return null;

  const isPreVoting = phase?.phase === 'coming-soon' || phase?.phase === 'nominations';
  const isComplete = phase?.phase === 'results';

  // Determine subtitle based on phase
  const subtitle = isPreVoting
    ? 'Starting pool · grows with votes'
    : isComplete
    ? 'Final prize pool'
    : 'Growing with every vote';

  if (compact) {
    return (
      <div className="prize-pool prize-pool-compact">
        <div className="prize-pool-header">
          <div className="prize-pool-label">
            <Trophy size={14} />
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

      <div className="prize-pool-breakdown">
        <div className="prize-tier prize-tier-first">
          <div className="prize-tier-label">
            <Crown size={16} className="prize-icon prize-gold" />
            <span>1st</span>
          </div>
          <div className="prize-tier-amount prize-gold">{prizePool.formatted.firstPrize}</div>
        </div>

        <div className="prize-tier prize-tier-second">
          <div className="prize-tier-label">
            <Award size={16} className="prize-icon prize-silver" />
            <span>2nd</span>
          </div>
          <div className="prize-tier-amount">{prizePool.formatted.secondPrize}</div>
        </div>

        <div className="prize-tier prize-tier-third">
          <div className="prize-tier-label">
            <Medal size={16} className="prize-icon prize-bronze" />
            <span>3rd</span>
          </div>
          <div className="prize-tier-amount">{prizePool.formatted.thirdPrize}</div>
        </div>
      </div>
    </div>
  );
}

export default PrizePool;
