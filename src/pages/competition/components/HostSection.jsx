import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';
import { User, MapPin, Globe, Instagram, Facebook, Music2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { transformSupabaseImage } from '../../../lib/storageImage';

// Turn a stored handle or partial URL into a full, safe https link.
// Handles all the ways a host might enter it: "@handle", "handle",
// "instagram.com/handle", "www.instagram.com/handle", or a full URL — without
// producing doubled domains, and rejecting non-web schemes (javascript:, etc).
const SOCIAL_DOMAINS = {
  instagram: 'instagram.com',
  tiktok: 'tiktok.com',
  facebook: 'facebook.com',
};

function normalizeSocialUrl(value, kind) {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  // Already a full URL — pass through only http(s).
  if (/^https?:\/\//i.test(v)) return v;
  // Block any other explicit scheme (javascript:, data:, mailto:, …).
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null;

  const lower = v.toLowerCase();
  const domain = SOCIAL_DOMAINS[kind];
  // Looks like a URL/domain/path already (website, a path, or the platform's
  // own domain) → just ensure an https scheme, don't prepend the platform host.
  const looksLikeUrl =
    kind === 'website' ||
    v.includes('/') ||
    lower.includes('fb.com') ||
    (domain && lower.includes(domain));
  if (looksLikeUrl) return `https://${v.replace(/^\/+/, '')}`;

  // Otherwise it's a bare handle → build the platform profile URL.
  const handle = v.replace(/^@/, '');
  switch (kind) {
    case 'instagram': return `https://instagram.com/${handle}`;
    case 'tiktok': return `https://tiktok.com/@${handle}`;
    case 'facebook': return `https://facebook.com/${handle}`;
    default: return `https://${handle}`;
  }
}

// The host org's website + socials, in display order, filled entries only.
function buildHostLinks(organization) {
  if (!organization) return [];
  const defs = [
    { key: 'website', label: 'Website', Icon: Globe, value: organization.website_url },
    { key: 'instagram', label: 'Instagram', Icon: Instagram, value: organization.instagram },
    { key: 'tiktok', label: 'TikTok', Icon: Music2, value: organization.tiktok },
    { key: 'facebook', label: 'Facebook', Icon: Facebook, value: organization.facebook },
  ];
  return defs
    .map((d) => ({ ...d, url: normalizeSocialUrl(d.value, d.key) }))
    .filter((d) => d.url);
}

function buildHostList(competition) {
  const list = [];
  // The creator/host is shown publicly only when show_public_host is on
  // (default true). Co-hosts are unaffected.
  if (competition?.host && competition?.show_public_host !== false) list.push(competition.host);
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
export function HostSection({ showHosts = true } = {}) {
  const { competition, sponsors, organization } = usePublicCompetition();
  const navigate = useNavigate();
  const location = useLocation();

  const hosts = showHosts ? buildHostList(competition) : [];
  const isPlural = hosts.length > 1;
  const hostLinks = buildHostLinks(organization);

  // Don't render anything if there's nothing to show
  if (hosts.length === 0 && (!sponsors || sponsors.length === 0) && hostLinks.length === 0) {
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
            {sponsors.map(sponsor => {
              const hasUrl = !!sponsor.website_url;
              const Wrapper = hasUrl ? 'a' : 'div';
              const wrapperProps = hasUrl
                ? { href: sponsor.website_url, target: '_blank', rel: 'noopener noreferrer' }
                : {};
              return (
                <Wrapper
                  key={sponsor.id}
                  {...wrapperProps}
                  className={`sponsor-item sponsor-tier-${sponsor.tier?.toLowerCase()}`}
                >
                  {sponsor.logo_url ? (
                    <img src={transformSupabaseImage(sponsor.logo_url, { width: 200, height: 100, resize: 'contain' })} alt={sponsor.name} className="sponsor-logo" />
                  ) : (
                    <span className="sponsor-name">{sponsor.name}</span>
                  )}
                  {sponsor.tier && sponsor.tier.toLowerCase() !== 'inkind' && (
                    <span className="sponsor-tier">{sponsor.tier}</span>
                  )}
                </Wrapper>
              );
            })}
          </div>
        </div>
      )}

      {/* Host website + socials — shown directly beneath sponsors */}
      {hostLinks.length > 0 && (
        <div className="host-links-card">
          <h4 className="section-label">
            {organization?.name ? `Follow ${organization.name}` : 'Follow Along'}
          </h4>
          <div className="host-links-row">
            {hostLinks.map(({ key, label, Icon, url }) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="host-link"
                aria-label={label}
              >
                <Icon size={18} />
                <span>{label}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default HostSection;
