import { useState } from 'react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { User, MapPin, Instagram, Twitter, Linkedin, Crown, X } from 'lucide-react';
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
  const [modalHost, setModalHost] = useState(null);

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
          {host.bio && <span className="host-card-bio">{host.bio}</span>}
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

  const renderHostEntry = (host) => {
    const instagramUrl = host.instagram ? `https://instagram.com/${host.instagram}` : null;

    // Featured + Instagram available: link straight to IG (matches prior behaviour
    // when there was a single host).
    if (isFeatured && instagramUrl) {
      return (
        <a
          key={host.id}
          className="host-card-content"
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {renderHostBody(host)}
        </a>
      );
    }

    if (isFeatured) {
      return (
        <div key={host.id} className="host-card-content host-card-content-static">
          {renderHostBody(host)}
        </div>
      );
    }

    return (
      <button
        key={host.id}
        className="host-card-content"
        onClick={() => setModalHost(host)}
      >
        {renderHostBody(host)}
      </button>
    );
  };

  return (
    <>
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

        {/* Compact-variant: surface each host's Instagram below their card */}
        {!isFeatured && (
          <div className="host-card-socials" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {hosts.map((host) => host.instagram ? (
              <a
                key={`ig-${host.id}`}
                href={`https://instagram.com/${host.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="host-card-social"
              >
                <Instagram size={16} />
                <span>@{host.instagram}</span>
              </a>
            ) : null)}
          </div>
        )}
      </div>

      {/* Host Profile Modal */}
      {modalHost && (
        <div className="modal-overlay" onClick={() => setModalHost(null)}>
          <div className="modal-container modal-host" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalHost(null)}>
              <X size={18} />
            </button>
            <div className="host-profile-modal">
              <div className="host-profile-header">
                {modalHost.avatar_url ? (
                  <img src={transformSupabaseImage(modalHost.avatar_url, { width: 200, height: 200 })} alt={getHostName(modalHost)} className="host-modal-avatar" />
                ) : (
                  <div className="host-modal-avatar-placeholder">
                    <User size={48} />
                  </div>
                )}
                <h2>{getHostName(modalHost)}</h2>
                {modalHost.city && (
                  <p className="host-modal-location">
                    <MapPin size={14} />
                    {modalHost.city}
                  </p>
                )}
              </div>
              {modalHost.bio && (
                <div className="host-modal-bio">
                  <p>{modalHost.bio}</p>
                </div>
              )}
              {(modalHost.instagram || modalHost.twitter || modalHost.linkedin) && (
                <div className="host-modal-socials">
                  {modalHost.instagram && (
                    <a
                      href={`https://instagram.com/${modalHost.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link"
                    >
                      <Instagram size={20} />
                    </a>
                  )}
                  {modalHost.twitter && (
                    <a
                      href={`https://twitter.com/${modalHost.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link"
                    >
                      <Twitter size={20} />
                    </a>
                  )}
                  {modalHost.linkedin && (
                    <a
                      href={`https://linkedin.com/in/${modalHost.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link"
                    >
                      <Linkedin size={20} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HostCard;
