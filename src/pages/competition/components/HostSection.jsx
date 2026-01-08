import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { User, MapPin } from 'lucide-react';

/**
 * Host information section
 */
export function HostSection() {
  const { competition, sponsors } = usePublicCompetition();

  // Host data would come from a join with profiles table
  // For now, show basic info if available
  const host = competition?.host;

  return (
    <div className="host-section">
      {/* Host Card */}
      <div className="host-card">
        <h4 className="section-label">Your Host</h4>

        {host ? (
          <div className="host-info">
            {host.avatar_url ? (
              <img src={host.avatar_url} alt={host.name} className="host-avatar" />
            ) : (
              <div className="host-avatar-placeholder">
                <User size={24} />
              </div>
            )}
            <div className="host-details">
              <span className="host-name">{host.name || 'Competition Host'}</span>
              {host.title && <span className="host-title">{host.title}</span>}
              {host.location && (
                <span className="host-location">
                  <MapPin size={12} />
                  {host.location}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="host-info">
            <div className="host-avatar-placeholder">
              <User size={24} />
            </div>
            <div className="host-details">
              <span className="host-name">Official Host</span>
            </div>
          </div>
        )}
      </div>

      {/* Sponsors */}
      {sponsors?.length > 0 && (
        <div className="sponsors-card">
          <h4 className="section-label">Sponsors</h4>
          <div className="sponsors-list">
            {sponsors.map(sponsor => (
              <a
                key={sponsor.id}
                href={sponsor.website_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`sponsor-item sponsor-tier-${sponsor.tier?.toLowerCase()}`}
              >
                {sponsor.logo_url ? (
                  <img src={sponsor.logo_url} alt={sponsor.name} className="sponsor-logo" />
                ) : (
                  <span className="sponsor-name">{sponsor.name}</span>
                )}
                <span className="sponsor-tier">{sponsor.tier}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default HostSection;
