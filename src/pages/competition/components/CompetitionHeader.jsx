import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';

/**
 * Consistent competition header across all phases
 * Shows season, name, and description - editable from host dashboard
 */
export function CompetitionHeader({ badge, badgeIcon: BadgeIcon, badgeVariant = 'default' }) {
  const { competition, about, phase } = usePublicCompetition();

  // Determine badge variant class
  const badgeClass = {
    default: '',
    active: 'phase-badge-active',
    live: 'phase-badge-live',
    complete: 'phase-badge-complete',
  }[badgeVariant] || '';

  return (
    <section className="competition-header">
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

      {/* Description */}
      {about?.description && (
        <p className="competition-description">{about.description}</p>
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
