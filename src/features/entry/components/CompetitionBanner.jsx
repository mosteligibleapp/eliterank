import React from 'react';
import { Crown } from 'lucide-react';
import { getCompetitionTitle, getCityName } from '../utils/eligibilityEngine';

/**
 * Competition banner shown at the top of the entry flow
 * Displays competition name, city, and season dynamically
 */
export default function CompetitionBanner({ competition }) {
  const title = getCompetitionTitle(competition);
  const cityName = getCityName(competition);
  const season = competition?.season;
  const accentColor = competition?.theme_primary || '#d4af37';

  return (
    <div className="entry-banner">
      <div className="entry-banner-icon" style={{ background: `${accentColor}20` }}>
        <Crown size={28} style={{ color: accentColor }} />
      </div>
      <h1 className="entry-banner-title">{title}</h1>
      <p className="entry-banner-sub">
        {cityName}{season ? ` • Season ${season}` : ''}
      </p>
    </div>
  );
}
