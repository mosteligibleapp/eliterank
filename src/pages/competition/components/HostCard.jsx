import { useState } from 'react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { User, MapPin, Instagram, Twitter, Linkedin, Crown, X } from 'lucide-react';
import { transformSupabaseImage } from '../../../lib/storageImage';

/**
 * Host profile card. Defaults to a compact horizontal card; pass
 * variant="featured" for the centered vertical teaser layout.
 */
export function HostCard({ variant = 'compact' }) {
  const { competition } = usePublicCompetition();
  const [showHostModal, setShowHostModal] = useState(false);

  const host = competition?.host;
  const hostName = host ? `${host.first_name || ''} ${host.last_name || ''}`.trim() : null;

  if (!host) return null;

  const isFeatured = variant === 'featured';
  const instagramUrl = host.instagram ? `https://instagram.com/${host.instagram}` : null;

  const cardInner = (
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
        <span className="host-card-name">{hostName || 'Competition Host'}</span>
        {host.bio && (
          <span className="host-card-bio">
            {host.bio}
          </span>
        )}
        {host.city && (
          <span className="host-card-location">
            <MapPin size={12} />
            {host.city}
          </span>
        )}
      </div>
    </>
  );

  // Featured variant on the teaser: clicking the whole card jumps straight to
  // Instagram (when set). Compact variant keeps the modal-on-click behaviour
  // so users can still see the bio + other socials.
  const renderCardBody = () => {
    if (isFeatured) {
      if (instagramUrl) {
        return (
          <a
            className="host-card-content"
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {cardInner}
          </a>
        );
      }
      return <div className="host-card-content host-card-content-static">{cardInner}</div>;
    }
    return (
      <button
        className="host-card-content"
        onClick={() => setShowHostModal(true)}
      >
        {cardInner}
      </button>
    );
  };

  return (
    <>
      <div className={`sidebar-card host-sidebar-card${isFeatured ? ' host-sidebar-card-featured' : ''}`}>
        <div className="sidebar-card-header">
          {!isFeatured && <Crown size={16} />}
          <span>Your Host</span>
        </div>

        {renderCardBody()}

        {!isFeatured && host.instagram && (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="host-card-social"
          >
            <Instagram size={16} />
            <span>@{host.instagram}</span>
          </a>
        )}
      </div>

      {/* Host Profile Modal */}
      {showHostModal && (
        <div className="modal-overlay" onClick={() => setShowHostModal(false)}>
          <div className="modal-container modal-host" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowHostModal(false)}>
              <X size={18} />
            </button>
            <div className="host-profile-modal">
              <div className="host-profile-header">
                {host.avatar_url ? (
                  <img src={transformSupabaseImage(host.avatar_url, { width: 200, height: 200 })} alt={hostName} className="host-modal-avatar" />
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
    </>
  );
}

export default HostCard;
