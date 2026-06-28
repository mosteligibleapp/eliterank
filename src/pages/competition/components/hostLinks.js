import { Globe, Instagram, Facebook, Music2 } from 'lucide-react';

/**
 * Host (organization) website + social links — shared by the competition footer.
 *
 * Turns a stored handle or partial URL into a full, safe https link, handling
 * all the ways a host might enter it ("@handle", "handle", "instagram.com/x",
 * "www.instagram.com/x", or a full URL) without producing doubled domains, and
 * rejecting non-web schemes (javascript:, data:, …).
 */
const SOCIAL_DOMAINS = {
  instagram: 'instagram.com',
  tiktok: 'tiktok.com',
  facebook: 'facebook.com',
};

export function normalizeSocialUrl(value, kind) {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  // Already a full URL — pass through only http(s).
  if (/^https?:\/\//i.test(v)) return v;
  // Block any other explicit scheme (javascript:, data:, mailto:, …).
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null;

  const lower = v.toLowerCase();
  const domain = SOCIAL_DOMAINS[kind];
  // Looks like a URL/domain/path already → just ensure an https scheme.
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
export function buildHostLinks(organization) {
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
