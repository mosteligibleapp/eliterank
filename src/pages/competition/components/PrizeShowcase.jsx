import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Gift } from 'lucide-react';
import { transformSupabaseImage } from '../../../lib/storageImage';

/**
 * PrizeShowcase — itemized prizes/rewards awarded in the competition.
 * Reads competition_prizes (title, description, value, sponsor, image) and
 * renders them as a card grid. Distinct from the cash <PrizePool> total.
 * Renders nothing when there are no itemized prizes.
 */
export function PrizeShowcase() {
  const { prizes } = usePublicCompetition();

  const items = Array.isArray(prizes) ? prizes : [];
  if (!items.length) return null;

  return (
    <div className="competition-prizes">
      <div className="competition-section-header">
        <Gift size={20} className="competition-section-icon" />
        <h2 className="competition-section-title">Prizes</h2>
      </div>

      <div className="competition-prizes-grid">
        {items.map((prize) => {
          const Wrapper = prize.external_url ? 'a' : 'div';
          const wrapperProps = prize.external_url
            ? { href: prize.external_url, target: '_blank', rel: 'noopener noreferrer' }
            : {};
          return (
            <Wrapper key={prize.id} className="competition-prize-card" {...wrapperProps}>
              <div className="competition-prize-media">
                {prize.image_url ? (
                  <img
                    src={transformSupabaseImage(prize.image_url, { width: 400, height: 300 })}
                    alt={prize.title}
                    loading="lazy"
                  />
                ) : (
                  <Gift size={36} className="competition-prize-placeholder" />
                )}
              </div>
              <div className="competition-prize-body">
                <h3 className="competition-prize-title">{prize.title}</h3>
                {prize.value && <span className="competition-prize-value">{prize.value}</span>}
                {prize.description && (
                  <p className="competition-prize-desc">{prize.description}</p>
                )}
                {prize.sponsor_name && (
                  <span className="competition-prize-sponsor">Sponsored by {prize.sponsor_name}</span>
                )}
              </div>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}

export default PrizeShowcase;
