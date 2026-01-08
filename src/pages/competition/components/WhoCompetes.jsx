import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Crown, Check } from 'lucide-react';

/**
 * "Who Competes?" section showing eligibility traits
 */
export function WhoCompetes() {
  const { about } = usePublicCompetition();

  if (!about?.traits?.length) return null;

  return (
    <div className="who-competes">
      <div className="who-competes-header">
        <Crown size={24} className="who-competes-icon" />
        <h3>Who Competes?</h3>
      </div>

      <div className="who-competes-traits">
        {about.traits.map((trait, index) => (
          <div key={index} className="trait-item">
            <Check size={14} className="trait-check" />
            <span>{trait}</span>
          </div>
        ))}
      </div>

      <div className="who-competes-requirements">
        {about.ageRange && (
          <div className="requirement-item">
            <span className="requirement-label">Age Range</span>
            <span className="requirement-value">{about.ageRange}</span>
          </div>
        )}
        {about.requirement && (
          <div className="requirement-item">
            <span className="requirement-label">Requirement</span>
            <span className="requirement-value">{about.requirement}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default WhoCompetes;
