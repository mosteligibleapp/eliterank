import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Crown } from 'lucide-react';

/**
 * Consistent competition header across all phases
 * Shows organization branding, season, name, and description
 */
export function CompetitionHeader({ badge, badgeIcon: BadgeIcon, badgeVariant = 'default' }) {
  const { competition, organization, about } = usePublicCompetition();

  // Determine badge variant class
  const badgeClass = {
    default: '',
    active: 'phase-badge-active',
    live: 'phase-badge-live',
    complete: 'phase-badge-complete',
  }[badgeVariant] || '';

  return (
    <section className="competition-header">
      {/* Organization Branding */}
      <div className="org-branding">
        <div className="org-logo">
          {organization?.logo_url ? (
            <img
              src={organization.logo_url}
              alt={organization.name}
            />
          ) : (
            <Crown size={40} />
          )}
        </div>
        <span className="org-presented-by">Presented by</span>
        <span className="org-name">{organization?.name || 'Elite Rank'}</span>
      </div>

      {/* Season Tag */}
      {competition?.season && (
        <span className="competition-season">Season {competition.season}</span>
      )}

      {/* Competition Name */}
      <h1 className="competition-name">{competition?.name || 'Most Eligible'}</h1>

      {/* City */}
      {competition?.city && (
        <h2 className="competition-city">{competition.city}</h2>
      )}

      {/* Phase Badge */}
      {badge && (
        <div className={`phase-badge ${badgeClass}`}>
          {BadgeIcon && <BadgeIcon size={14} />}
          <span className="badge-dot" />
          {badge}
        </div>
      )}
    </section>
  );
}

export default CompetitionHeader;
