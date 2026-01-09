import { useState } from 'react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { User, MapPin, Instagram, Twitter, Linkedin, X } from 'lucide-react';

/**
 * Host information section
 */
export function HostSection() {
  const { competition, sponsors } = usePublicCompetition();
  const [showHostModal, setShowHostModal] = useState(false);

  // Host data comes from profiles table join
  const host = competition?.host;
  const hostName = host ? `${host.first_name || ''} ${host.last_name || ''}`.trim() : null;

  return (
    <div className="host-section">
      {/* Host Card */}
      <div className="host-card">
        <h4 className="section-label">Your Host</h4>

        {host ? (
          <button
            className="host-info host-info-clickable"
            onClick={() => setShowHostModal(true)}
          >
            {host.avatar_url ? (
              <img src={host.avatar_url} alt={hostName} className="host-avatar" />
            ) : (
              <div className="host-avatar-placeholder">
                <User size={24} />
              </div>
            )}
            <div className="host-details">
              <span className="host-name">{hostName || 'Competition Host'}</span>
              {host.bio && <span className="host-title">{host.bio.substring(0, 50)}...</span>}
              {host.city && (
                <span className="host-location">
                  <MapPin size={12} />
                  {host.city}
                </span>
              )}
            </div>
          </button>
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

      {/* Host Profile Modal */}
      {showHostModal && host && (
        <div className="modal-overlay" onClick={() => setShowHostModal(false)}>
          <div className="modal-container modal-host" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowHostModal(false)}>
              <X size={18} />
            </button>
            <div className="host-profile-modal">
              <div className="host-profile-header">
                {host.avatar_url ? (
                  <img src={host.avatar_url} alt={hostName} className="host-modal-avatar" />
                ) : (
                  <div className="host-modal-avatar-placeholder">
                    <User size={48} />
                  </div>
                )}
                <h2>{hostName}</h2>
                {host.city && (
                  <p className="host-modal-location">
                    <MapPin size={14} />
                    {host.city}
                  </p>
                )}
              </div>
              {host.bio && (
                <div className="host-modal-bio">
                  <p>{host.bio}</p>
                </div>
              )}
              {(host.instagram || host.twitter || host.linkedin) && (
                <div className="host-modal-socials">
                  {host.instagram && (
                    <a
                      href={`https://instagram.com/${host.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link"
                    >
                      <Instagram size={20} />
                    </a>
                  )}
                  {host.twitter && (
                    <a
                      href={`https://twitter.com/${host.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link"
                    >
                      <Twitter size={20} />
                    </a>
                  )}
                  {host.linkedin && (
                    <a
                      href={`https://linkedin.com/in/${host.linkedin}`}
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
