import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Check, MapPin, Users, Heart, Calendar } from 'lucide-react';
import EliteRankCrown from '../../../components/ui/icons/EliteRankCrown';

/**
 * "Who Competes?" section showing eligibility traits and requirements
 * Two-column layout with aligned rows: traits on left, requirements on right
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

  // Build requirements array to match traits count
  const requirements = [
    { icon: Calendar, label: 'Age', value: about.ageRange || '21+' },
    { icon: Users, label: 'Gender', value: getGender() },
    { icon: Heart, label: 'Status', value: 'Single' },
    { icon: MapPin, label: 'Location', value: city },
  ];

  // Take only as many requirements as there are traits (usually 4 each)
  const rowCount = Math.min(about.traits.length, requirements.length);

  return (
    <div className="who-competes">
      <div className="who-competes-header">
        <EliteRankCrown size={28} className="who-competes-icon" />
        <h3>Who Competes?</h3>
      </div>

      <div className="who-competes-grid">
        {Array.from({ length: rowCount }).map((_, index) => {
          const trait = about.traits[index];
          const req = requirements[index];
          const ReqIcon = req.icon;

          return (
            <div key={index} className="who-competes-row">
              {/* Trait (left) */}
              <div className="trait-item">
                <Check size={16} className="trait-check" />
                <span>{trait}</span>
              </div>

              {/* Requirement (right) */}
              <div className="requirement-row">
                <ReqIcon size={16} className="requirement-icon" />
                <div className="requirement-text">
                  <span className="requirement-label">{req.label}</span>
                  <span className="requirement-value">{req.value}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WhoCompetes;
