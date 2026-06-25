import React from 'react';
import { Crown } from 'lucide-react';
import { getCompetitionTitle, getCityName } from '../utils/eligibilityEngine';

/**
 * Competition banner shown at the top of the entry flow
 * Displays competition name, city, and season dynamically
 */
export default function CompetitionBanner({ competition, logoUrl }) {
  const title = getCompetitionTitle(competition);
  const cityName = getCityName(competition);
  const season = competition?.season;
  const accentColor = competition?.theme_primary || '#d4af37';
  // Prefer the host org's logo; fall back to the crown when there isn't one.
  const orgLogo = logoUrl
    || competition?.organization?.logo_url
    || competition?.organization?.header_logo_url;

  return (
    <div className="entry-banner">
      <div className="entry-banner-icon" style={{ background: orgLogo ? 'transparent' : `${accentColor}20` }}>
        {orgLogo ? (
          <img src={orgLogo} alt={title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <Crown size={28} style={{ color: accentColor }} />
        )}
      </div>
      <h1 className="entry-banner-title">{title}</h1>
      <p className="entry-banner-sub">
        {cityName}{season ? ` • Season ${season}` : ''}
      </p>
    </div>
  );
}
