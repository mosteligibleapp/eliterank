import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Check, MapPin, Users, Heart, Calendar } from 'lucide-react';
import EliteRankCrown from '../../../components/ui/icons/EliteRankCrown';

/**
 * "Who Competes?" section showing eligibility traits and requirements
 * Two-column layout: traits on left, requirements on right
 */
export function WhoCompetes() {
  const { about, competition } = usePublicCompetition();

  if (!about?.traits?.length) return null;

  // Extract gender from demographic or competition name
  const getGender = () => {
    if (competition?.demographic?.name) {
      return competition.demographic.name;
    }
    // Try to infer from competition name
    const name = competition?.name?.toLowerCase() || '';
    if (name.includes('women') || name.includes('female')) return 'Women';
    if (name.includes('men') || name.includes('male')) return 'Men';
    return 'All Genders';
  };

  // Get city name
  const city = competition?.city || 'Local Area';

  return (
    <div className="who-competes">
      <div className="who-competes-header">
        <EliteRankCrown size={28} className="who-competes-icon" />
        <h3>Who Competes?</h3>
      </div>

      <div className="who-competes-content">
        {/* Left Column - Traits */}
        <div className="who-competes-traits-column">
          {about.traits.map((trait, index) => (
            <div key={index} className="trait-item">
              <Check size={16} className="trait-check" />
              <span>{trait}</span>
            </div>
          ))}
        </div>

        {/* Right Column - Requirements */}
        <div className="who-competes-requirements-column">
          {about.ageRange && (
            <div className="requirement-row">
              <Calendar size={16} className="requirement-icon" />
              <div className="requirement-text">
                <span className="requirement-label">Age</span>
                <span className="requirement-value">{about.ageRange}</span>
              </div>
            </div>
          )}

          <div className="requirement-row">
            <Users size={16} className="requirement-icon" />
            <div className="requirement-text">
              <span className="requirement-label">Gender</span>
              <span className="requirement-value">{getGender()}</span>
            </div>
          </div>

          <div className="requirement-row">
            <Heart size={16} className="requirement-icon" />
            <div className="requirement-text">
              <span className="requirement-label">Status</span>
              <span className="requirement-value">Single</span>
            </div>
          </div>

          <div className="requirement-row">
            <MapPin size={16} className="requirement-icon" />
            <div className="requirement-text">
              <span className="requirement-label">Location</span>
              <span className="requirement-value">{city}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhoCompetes;
