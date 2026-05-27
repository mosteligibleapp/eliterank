import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { User, MapPin, Crown } from 'lucide-react';
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
  return `${host.first_name || ''} ${host.last_name || ''}`.trim() || 'Competition Host';
}

/**
 * Host profile card. Defaults to a compact horizontal card; pass
 * variant="featured" for the centered vertical teaser layout.
 *
 * When multiple hosts are assigned (primary + co-hosts), all are rendered
 * side-by-side in a responsive grid.
 */
export function HostCard({ variant = 'compact' }) {
  const { competition } = usePublicCompetition();
  const navigate = useNavigate();
  const location = useLocation();

  const hosts = buildHostList(competition);
  if (hosts.length === 0) return null;

  const isFeatured = variant === 'featured';
  const isPlural = hosts.length > 1;

  const renderHostBody = (host) => {
    const hostName = getHostName(host);
    return (
      <>
        <div className="host-card-avatar">
          {host.avatar_url ? (
            <img src={transformSupabaseImage(host.avatar_url, { width: 150, height: 150 })} alt={hostName} />
          ) : (
            <div className="host-card-avatar-placeholder">
              <User size={isFeatured ? 48 : 28} />
            </div>
          )}
        </div>
        <div className="host-card-info">
          <span className="host-card-name">{hostName}</span>
          {host.headline && <span className="host-card-bio">{host.headline}</span>}
          {host.city && (
            <span className="host-card-location">
              <MapPin size={12} />
              {host.city}
            </span>
          )}
        </div>
      </>
    );
  };

  const renderHostEntry = (host) => (
    <button
      key={host.id}
      className="host-card-content"
      onClick={() => navigate(`/profile/${host.id}${location.search || ''}`)}
    >
      {renderHostBody(host)}
    </button>
  );

  return (
    <div className={`sidebar-card host-sidebar-card${isFeatured ? ' host-sidebar-card-featured' : ''}`}>
      <div className="sidebar-card-header">
        {!isFeatured && <Crown size={16} />}
        <span>{isPlural ? 'Your Hosts' : 'Your Host'}</span>
      </div>

      <div
        className="host-card-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: isPlural ? 'repeat(auto-fit, minmax(220px, 1fr))' : '1fr',
          gap: '1rem',
          width: '100%',
        }}
      >
        {hosts.map(renderHostEntry)}
      </div>
    </div>
  );
}

export default HostCard;
