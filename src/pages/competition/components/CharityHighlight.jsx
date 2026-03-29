import { Heart } from 'lucide-react';
import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';

/**
 * Charity proceeds highlight section
 * Shows charity logo (clickable to website) and message about proceeds
 * Only renders if competition has charity_name set
 */
export function CharityHighlight() {
  const { competition } = usePublicCompetition();

  const charityName = competition?.charity_name;
  const charityLogoUrl = competition?.charity_logo_url;
  const charityWebsiteUrl = competition?.charity_website_url;

  if (!charityName) return null;

  const content = (
    <div className="charity-highlight-inner">
      {charityLogoUrl ? (
        <img
          src={charityLogoUrl}
          alt={charityName}
          className="charity-highlight-logo"
        />
      ) : (
        <div className="charity-highlight-icon-wrap">
          <Heart size={22} className="charity-highlight-icon" />
        </div>
      )}
      <div className="charity-highlight-info">
        <span className="charity-highlight-label">A Portion of Proceeds Benefits</span>
        <span className="charity-highlight-name">{charityName}</span>
      </div>
    </div>
  );

  if (charityWebsiteUrl) {
    return (
      <section className="charity-highlight">
        <a
          href={charityWebsiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="charity-highlight-link"
        >
          {content}
          <span className="charity-highlight-visit">Visit Website &rsaquo;</span>
        </a>
      </section>
    );
  }

  return (
    <section className="charity-highlight">
      {content}
    </section>
  );
}

export default CharityHighlight;
