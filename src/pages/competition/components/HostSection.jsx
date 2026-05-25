import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { User, MapPin } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { transformSupabaseImage } from '../../../lib/storageImage';

function buildHostList(competition) {
  const list = [];
  if (competition?.host) list.push(competition.host);
  const coHostRows = competition?.competition_co_hosts || [];
  for (const row of coHostRows) {
    if (row?.profile) list.push(row.profile);
  }
  return list;
}

function getHostName(host) {
  return `${host.first_name || ''} ${host.last_name || ''}`.trim();
}

/**
 * Host information section (sidebar). Renders the primary host plus any
 * co-hosts side-by-side in a responsive grid.
 */
export function HostSection() {
  const { competition, sponsors } = usePublicCompetition();
  const navigate = useNavigate();
  const location = useLocation();

  const hosts = buildHostList(competition);
  const isPlural = hosts.length > 1;

  // Don't render anything if no hosts AND no sponsors
  if (hosts.length === 0 && (!sponsors || sponsors.length === 0)) {
    return null;
  }

  return (
    <div className="host-section">
      {hosts.length > 0 && (
        <div className="host-card">
          <h4 className="section-label">{isPlural ? 'Your Hosts' : 'Your Host'}</h4>
          <div
            className="host-info-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: isPlural ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr',
              gap: '0.75rem',
            }}
          >
            {hosts.map((host) => {
              const hostName = getHostName(host);
              return (
                <button
                  key={host.id}
                  className="host-info host-info-clickable"
                  onClick={() => navigate(`/profile/${host.id}${location.search || ''}`)}
                >
                  {host.avatar_url ? (
                    <img src={transformSupabaseImage(host.avatar_url, { width: 150, height: 150 })} alt={hostName} className="host-avatar" />
                  ) : (
                    <div className="host-avatar-placeholder">
                      <User size={48} />
                    </div>
                  )}
                  <div className="host-details">
                    <span className="host-name">{hostName || 'Competition Host'}</span>
                    {host.bio && (
                      <span className="host-title">
                        {host.bio.length > 100 ? host.bio.substring(0, 100) + '...' : host.bio}
                      </span>
                    )}
                    {host.city && (
                      <span className="host-location">
                        <MapPin size={12} />
                        {host.city}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
                  <img src={transformSupabaseImage(sponsor.logo_url, { width: 200, height: 100 })} alt={sponsor.name} className="sponsor-logo" />
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
