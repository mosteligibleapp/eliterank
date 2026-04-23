import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { Crown } from 'lucide-react';

/**
 * Consistent competition header across all phases
 * Shows organization branding, season, name, and description
 *
 * Pass `compact` for secondary views (leaderboard, prizes) where the header
 * should take less vertical space so the primary content is above the fold.
 * Pass `iconOnly` to prefer the square icon logo over the wide wordmark while
 * keeping the full header layout (e.g. on the voting phase).
 */
export function CompetitionHeader({ badge, badgeIcon: BadgeIcon, badgeVariant = 'default', compact = false, iconOnly = false }) {
  const { competition, organization, about } = usePublicCompetition();

  // Determine badge variant class
  const badgeClass = {
    default: '',
    active: 'phase-badge-active',
    live: 'phase-badge-live',
    complete: 'phase-badge-complete',
  }[badgeVariant] || '';

  // In compact or icon-only mode prefer the square icon logo over the wide
  // wordmark. Compact is used on leaderboard/prizes to shrink the header;
  // icon-only keeps the full header layout but swaps the logo variant.
  const preferIcon = compact || iconOnly;
  const headerLogo = preferIcon
    ? (organization?.logo_url || organization?.header_logo_url)
    : (organization?.header_logo_url || organization?.logo_url);
  const websiteUrl = organization?.website_url;

  const logoContent = headerLogo ? (
    <img src={headerLogo} alt={organization.name} />
  ) : (
    <Crown size={40} />
  );

  return (
    <section className={`competition-header${compact ? ' competition-header-compact' : ''}${iconOnly && !compact ? ' competition-header-icon-only' : ''}`}>
      {/* Organization Branding */}
      <div className="org-branding">
        <span className="org-presented-by">Presented by</span>
        <div className="org-logo">
          {websiteUrl ? (
            <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
              {logoContent}
            </a>
          ) : (
            logoContent
          )}
        </div>
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

      {/* Description — hidden in compact header to save vertical space */}
      {about?.description && !compact && (
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
