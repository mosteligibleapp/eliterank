import { usePublicCompetition } from '../../../contexts/PublicCompetitionContext';

/**
 * Charity proceeds highlight section
 * Shows charity logo (clickable to website) centered with a label
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
      <span className="charity-highlight-label">A Portion of Proceeds Benefits</span>
      {charityLogoUrl ? (
        <img
          src={charityLogoUrl}
          alt={charityName}
          className="charity-highlight-logo"
        />
      ) : (
        <span className="charity-highlight-name">{charityName}</span>
      )}
    </div>
  );

  if (charityWebsiteUrl) {
    return (
      <div className="charity-highlight">
        <a
          href={charityWebsiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="charity-highlight-link"
        >
          {content}
        </a>
      </div>
    );
  }

  return (
    <div className="charity-highlight">
      {content}
    </div>
  );
}

export default CharityHighlight;
